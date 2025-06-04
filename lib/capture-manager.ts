import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";
import { db } from "@/db";
import { captureJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { exec } from "child_process";

// Define emulator interface
interface IDVEmulator {
  startCapture(outputPath: string): Promise<ChildProcess>;
}

// Import the server-side emulator only
let DVEmulator: { getInstance(): IDVEmulator } | null = null;
try {
  if (typeof window === 'undefined') {
    const emulatorModule = require('./dv-emulator.server');
    DVEmulator = emulatorModule.DVEmulator;
  }
} catch (error) {
  console.warn('Failed to load DV emulator:', error);
}

export interface CaptureJob {
  id: string;
  collectionId: number;
  collectionName: string;
  status: "starting" | "running" | "completed" | "failed" | "cancelled";
  startTime: Date;
  endTime?: Date;
  progress?: number;
  error?: string;
  outputPath?: string;
}

class CaptureManager extends EventEmitter {
  private jobs: Map<string, CaptureJob> = new Map();
  private processes: Map<string, ChildProcess> = new Map(); // Separate process tracking
  private static instance: CaptureManager;
  private dvEmulator: IDVEmulator | null = null;

  private constructor() {
    super();
    if (DVEmulator) {
      this.dvEmulator = DVEmulator.getInstance();
    }
  }

  static getInstance(): CaptureManager {
    if (!CaptureManager.instance) {
      CaptureManager.instance = new CaptureManager();
      // Load existing jobs from database on startup
      CaptureManager.instance.loadJobsFromDatabase();
    }
    return CaptureManager.instance;
  }

  private async loadJobsFromDatabase(): Promise<void> {
    try {
      const dbJobs = await db.select().from(captureJobs);
      
      for (const dbJob of dbJobs) {
        const job: CaptureJob = {
          id: dbJob.id,
          collectionId: dbJob.collectionId,
          collectionName: dbJob.collectionName,
          status: dbJob.status as CaptureJob["status"],
          startTime: dbJob.startTime,
          endTime: dbJob.endTime || undefined,
          progress: dbJob.progress || undefined,
          error: dbJob.error || undefined,
          outputPath: dbJob.outputPath || undefined,
        };
        
        this.jobs.set(job.id, job);
        
        // If job was running when server stopped, mark it as failed
        if (job.status === "starting" || job.status === "running") {
          job.status = "failed";
          job.error = "Process interrupted by server restart";
          job.endTime = new Date();
          await this.updateJobInDatabase(job);
        }
      }
      
      console.log(`Loaded ${dbJobs.length} capture jobs from database`);
    } catch (error) {
      console.error("Failed to load jobs from database:", error);
    }
  }

  private async saveJobToDatabase(job: CaptureJob): Promise<void> {
    try {
      await db.insert(captureJobs).values({
        id: job.id,
        collectionId: job.collectionId,
        collectionName: job.collectionName,
        status: job.status,
        startTime: job.startTime,
        endTime: job.endTime || null,
        progress: job.progress || null,
        error: job.error || null,
        outputPath: job.outputPath || null,
      });
    } catch (error) {
      console.error("Failed to save job to database:", error);
    }
  }

  private async updateJobInDatabase(job: CaptureJob): Promise<void> {
    try {
      await db.update(captureJobs)
        .set({
          status: job.status,
          endTime: job.endTime || null,
          progress: job.progress || null,
          error: job.error || null,
          outputPath: job.outputPath || null,
          updatedAt: new Date(),
        })
        .where(eq(captureJobs.id, job.id));
    } catch (error) {
      console.error("Failed to update job in database:", error);
    }
  }

  /**
   * Check if real DV devices are available
   */
  private async checkRealDevices(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('dvrescue --status', { timeout: 5000 }, (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.log('No real DV devices available, using emulator');
          resolve(false);
          return;
        }
        
        const output = stdout.trim();
        const hasDevices = output !== "" && 
                          !output.includes("device not found") && 
                          !output.includes("No devices") &&
                          !output.includes("command not found");
        
        if (hasDevices) {
          console.log('Real DV devices detected');
        } else {
          console.log('No real DV devices available, using emulator');
        }
        
        resolve(hasDevices);
      });
    });
  }

  async startCapture(collectionId: number, collectionName: string): Promise<string> {
    const jobId = this.generateJobId();
    const foldername = collectionName.replace(/\s+/g, "-").toLowerCase();
    const baseDir = path.join(process.cwd(), "collections", foldername);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(baseDir, `capture_${timestamp}.dv`);

    await fs.mkdir(baseDir, { recursive: true });

    const job: CaptureJob = {
      id: jobId,
      collectionId,
      collectionName,
      status: "starting",
      startTime: new Date(),
      outputPath,
    };

    this.jobs.set(jobId, job);
    await this.saveJobToDatabase(job); // Save to database immediately

    try {
      // Check if real devices are available
      const hasRealDevices = await this.checkRealDevices();
      
      let captureProcess: ChildProcess;
        if (hasRealDevices) {
        // Use real dvrescue
        console.log(`Starting real DV capture for job ${jobId}`);
        captureProcess = spawn("dvrescue", [
          "--capture",
          outputPath,
          "--verbose"
        ], {
          stdio: ["pipe", "pipe", "pipe"],
        });
      } else if (this.dvEmulator) {
        // Use emulator
        console.log(`Starting emulated DV capture for job ${jobId}`);
        captureProcess = await this.dvEmulator.startCapture(outputPath);
      } else {
        throw new Error("No DV devices available and emulator not loaded");
      }

      this.processes.set(jobId, captureProcess); // Track process separately
      job.status = "running";
      this.jobs.set(jobId, job);
      await this.updateJobInDatabase(job); // Update database

      let stdoutData = "";
      let stderrData = "";

      // Handle process output
      captureProcess.stdout?.on("data", async (data) => {
        stdoutData += data.toString();
        await this.parseProgress(jobId, data.toString());
      });

      captureProcess.stderr?.on("data", (data) => {
        stderrData += data.toString();
        console.log(`Capture stderr [${jobId}]:`, data.toString());
      });

      // Handle process completion
      captureProcess.on("close", async (code, signal) => {
        const currentJob = this.jobs.get(jobId);
        if (!currentJob) return;

        currentJob.endTime = new Date();
        this.processes.delete(jobId); // Remove from process tracking

        if (signal === "SIGTERM" || signal === "SIGKILL") {
          currentJob.status = "cancelled";
          currentJob.error = `Process was terminated (${signal})`;
        } else if (code === 0) {
          currentJob.status = "completed";
          currentJob.progress = 100;
        } else {
          currentJob.status = "failed";
          currentJob.error = `Process exited with code ${code}. ${stderrData}`;
        }

        this.jobs.set(jobId, currentJob);
        await this.updateJobInDatabase(currentJob); // Update database
        this.emit("jobStatusChanged", currentJob);

        console.log(`Capture job ${jobId} finished with status: ${currentJob.status}`);
        if (currentJob.status === "completed") {
          console.log(`Output saved to: ${outputPath}`);
        }
      });

      // Handle process errors
      captureProcess.on("error", async (error) => {
        const currentJob = this.jobs.get(jobId);
        if (!currentJob) return;

        currentJob.status = "failed";
        currentJob.error = `Failed to start process: ${error.message}`;
        currentJob.endTime = new Date();
        this.processes.delete(jobId);
        
        this.jobs.set(jobId, currentJob);
        await this.updateJobInDatabase(currentJob); // Update database
        this.emit("jobStatusChanged", currentJob);
        
        console.error(`Capture job ${jobId} failed to start:`, error);
      });

      // Set a timeout for the job (optional - adjust as needed)
      const timeout = setTimeout(async () => {
        const job = this.jobs.get(jobId);
        if (job && job.status === "running") {
          await this.cancelJob(jobId);
        }
      }, 30 * 60 * 1000); // 30 minutes timeout

      // Clear timeout if job completes
      captureProcess.on("close", () => {
        clearTimeout(timeout);
      });

      this.emit("jobStatusChanged", job);
      return jobId;

    } catch (error) {
      job.status = "failed";
      job.error = `Failed to initialize capture: ${error}`;
      job.endTime = new Date();
      this.jobs.set(jobId, job);
      await this.updateJobInDatabase(job); // Update database
      this.emit("jobStatusChanged", job);
      throw error;
    }
  }

  getJob(jobId: string): CaptureJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): CaptureJob[] {
    return Array.from(this.jobs.values());
  }

  getJobsByCollection(collectionId: number): CaptureJob[] {
    return Array.from(this.jobs.values()).filter(
      job => job.collectionId === collectionId
    );
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    const process = this.processes.get(jobId);
    
    if (!job || !process) {
      return false;
    }

    try {
      // Try graceful termination first
      process.kill("SIGTERM");
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (process && !process.killed) {
          process.kill("SIGKILL");
        }
      }, 5000);

      return true;
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  private generateJobId(): string {
    return `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async parseProgress(jobId: string, output: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Try to parse progress from output (works for both dvrescue and emulator)
    const progressMatch = output.match(/(\d+)%/) || output.match(/(\d+)\/\d+/);
    if (progressMatch) {
      const newProgress = parseInt(progressMatch[1]);
      if (job.progress !== newProgress) {
        job.progress = newProgress;
        this.jobs.set(jobId, job);
        await this.updateJobInDatabase(job); // Update database with progress
        this.emit("jobStatusChanged", job);
      }
    }
  }

  // Cleanup old completed jobs (call this periodically)
  async cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const jobsToDelete: string[] = [];
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        job.status === "completed" || 
        job.status === "failed" || 
        job.status === "cancelled"
      ) {
        const jobAge = now - job.startTime.getTime();
        if (jobAge > maxAge) {
          jobsToDelete.push(jobId);
        }
      }
    }

    // Remove from memory
    for (const jobId of jobsToDelete) {
      this.jobs.delete(jobId);
    }

    // Remove from database
    if (jobsToDelete.length > 0) {
      try {
        await db.delete(captureJobs).where(
          eq(captureJobs.id, jobsToDelete[0])
        );
        console.log(`Cleaned up ${jobsToDelete.length} old jobs`);
      } catch (error) {
        console.error("Failed to cleanup old jobs from database:", error);
      }
    }
  }
}

export const captureManager = CaptureManager.getInstance();
