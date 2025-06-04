import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { exec, spawn } from "child_process";
import { tags, collections } from "@/db/schema";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { captureManager } from "@/lib/capture-manager";

// Import server-side emulator
let DVEmulator: any = null;
try {
  DVEmulator = require("@/lib/dv-emulator.server").DVEmulator;
} catch (error) {
  console.warn('Failed to load DV emulator:', error);
}
export const appRouter = createTRPCRouter({
  listDevices: baseProcedure.query(async ({ ctx }) => {
    const command = "dvrescue --status";

    return new Promise((resolve) => {      exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          // Fallback to emulator
          if (DVEmulator) {
            const emulator = DVEmulator.getInstance();
            emulator.listDevices().then((result: any) => {
              resolve({
                success: result.success,
                devices: result.devices || [],
                message: result.message + " (Using emulator)",
                isEmulated: true
              });
            });
          } else {
            resolve({
              success: false,
              devices: [],
              message: "No DV devices found and emulator not available",
              isEmulated: false
            });
          }
          return;
        }        if (stderr) {
          console.error(`stderr: ${stderr}`);
          // Fallback to emulator
          if (DVEmulator) {
            const emulator = DVEmulator.getInstance();
            emulator.listDevices().then((result: any) => {
              resolve({
                success: result.success,
                devices: result.devices || [],
                message: result.message + " (Using emulator)",
                isEmulated: true
              });
            });
          } else {
            resolve({
              success: false,
              devices: [],
              message: "No DV devices found and emulator not available",
              isEmulated: false
            });
          }
          return;
        }

        console.log(`stdout: ${stdout}`);

        try {
          const output = stdout.trim();          if (
            output === "" ||
            output.includes("device not found") ||
            output.includes("No devices")
          ) {
            // No real devices, use emulator
            if (DVEmulator) {
              const emulator = DVEmulator.getInstance();
              emulator.listDevices().then((result: any) => {
                resolve({
                  success: result.success,
                  devices: result.devices || [],
                  message: result.message + " (Using emulator)",
                  isEmulated: true
                });
              });
            } else {
              resolve({
                success: false,
                devices: [],
                message: "No DV devices found and emulator not available",
                isEmulated: false
              });
            }
          } else {
            resolve({
              success: true,
              message: "Real DV devices found",
              devices: output.split("\n").filter((line) => line.trim() !== ""),
              rawOutput: output,
              isEmulated: false
            });
          }        } catch (parseError) {
          // Fallback to emulator on parse error
          if (DVEmulator) {
            const emulator = DVEmulator.getInstance();
            emulator.listDevices().then((result: any) => {
              resolve({
                success: result.success,
                devices: result.devices || [],
                message: result.message + " (Using emulator - parse error)",
                isEmulated: true
              });
            });
          } else {
            resolve({
              success: false,
              devices: [],
              message: "Parse error and emulator not available",
              isEmulated: false
            });
          }
        }
      });
    });
  }),
  newCollection: baseProcedure
    .input(
      z.object({
        name: z.string().min(1, "Collection name is required"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { name, description } = input;
      const foldername = input.name.replace(/\s+/g, "-").toLowerCase();
      const baseDir = path.join(process.cwd(), "collections");
      const newFolderPath = path.join(baseDir, foldername);

      try {
        const [newCollection] = await db
          .insert(collections)
          .values({
            name,
            description: description || "",
          })
          .returning();

        await fs.mkdir(newFolderPath, { recursive: true });

        return {
          success: true,
          collection: newCollection,
          message: `Collection '${name}' created successfully at ${newFolderPath}`,
        };
      } catch (error) {
        console.error("Error creating collection:", error);
        return {
          success: false,
          error: "Failed to create collection",
        };
      }
    }),
  fetchCollections: baseProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    try {
      const collectionsList = await db.select().from(collections);
      return {
        success: true,
        collections: collectionsList,
      };
    } catch (error) {
      console.error("Error fetching collections:", error);
      return {
        success: false,
        error: "Failed to fetch collections",
      };
    }
  }),  startCapture: baseProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { collectionId } = input;
      
      try {
        const collection = await db
          .select()
          .from(collections)
          .where(eq(collections.id, collectionId))
          .limit(1)
          .then((rows) => rows[0]);

        if (!collection) {
          return {
            success: false,
            error: "Collection not found",
          };
        }

        const jobId = await captureManager.startCapture(collection.id, collection.name);

        return {
          success: true,
          message: "Capture started successfully",
          jobId,
        };
      } catch (error) {
        console.error("Failed to start capture:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to start capture",
        };
      }
    }),

  getJobStatus: baseProcedure
    .input(
      z.object({
        jobId: z.string(),
      })
    )
    .query(({ input }) => {
      const { jobId } = input;
      const job = captureManager.getJob(jobId);
      
      if (!job) {
        return {
          success: false,
          error: "Job not found",
        };
      }

      return {
        success: true,
        job: {
          id: job.id,
          collectionId: job.collectionId,
          collectionName: job.collectionName,
          status: job.status,
          startTime: job.startTime,
          endTime: job.endTime,
          progress: job.progress,
          error: job.error,
          outputPath: job.outputPath,
        },
      };
    }),

  getAllJobs: baseProcedure.query(() => {
    const jobs = captureManager.getAllJobs();
    
    return {
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        collectionId: job.collectionId,
        collectionName: job.collectionName,
        status: job.status,
        startTime: job.startTime,
        endTime: job.endTime,
        progress: job.progress,
        error: job.error,
        outputPath: job.outputPath,
      })),
    };
  }),

  getJobsByCollection: baseProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
      })
    )
    .query(({ input }) => {
      const { collectionId } = input;
      const jobs = captureManager.getJobsByCollection(collectionId);
      
      return {
        success: true,
        jobs: jobs.map(job => ({
          id: job.id,
          collectionId: job.collectionId,
          collectionName: job.collectionName,
          status: job.status,
          startTime: job.startTime,
          endTime: job.endTime,
          progress: job.progress,
          error: job.error,
          outputPath: job.outputPath,
        })),
      };
    }),

  cancelCapture: baseProcedure
    .input(
      z.object({
        jobId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { jobId } = input;
      
      const success = await captureManager.cancelJob(jobId);
      
      if (success) {
        return {
          success: true,
          message: "Capture cancelled successfully",
        };
      } else {
        return {
          success: false,
          error: "Failed to cancel capture or job not found",
        };
      }
    }),
});

export type AppRouter = typeof appRouter;
