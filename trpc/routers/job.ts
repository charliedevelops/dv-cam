import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { tags, collections } from "@/db/schema";
import fs from "fs/promises";
import path from "path";
import { eq, inArray, desc } from "drizzle-orm";
import { jobs, jobLogs } from "@/db/schema";
import { execa } from "execa";

export const jobRouter = createTRPCRouter({
  start: baseProcedure
    .input(
      z.object({
        collectionId: z.number().min(1, "Collection ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { collectionId } = input;

      const collection = await db
        .select({ name: collections.name })
        .from(collections)
        .where(eq(collections.id, collectionId))
        .limit(1);

      if (!collection.length) {
        throw new Error(`Collection with ID ${collectionId} not found`);
      }

      const collectionName = collection[0].name;

      const collectionDir = path.join(
        process.cwd(),
        "collections",
        collectionName
      );

      const existingRunningJob = await db
        .select({ id: jobs.id, status: jobs.status })
        .from(jobs)
        .where(eq(jobs.collectionId, collectionId))
        .orderBy(desc(jobs.createdAt))
        .limit(1);

      let jobId: number;
      if (
        existingRunningJob.length > 0 &&
        existingRunningJob[0].status === "running"
      ) {
        jobId = existingRunningJob[0].id;
        await db
          .update(jobs)
          .set({ progress: 0 })
          .where(eq(jobs.id, jobId))
          .execute();
      } else {
        const newJob = await db
          .insert(jobs)
          .values({
            collectionId,
            status: "running",
            progress: 0,
          })
          .returning({ id: jobs.id });
        jobId = newJob[0].id;
      }

      function checkFolder(targetPath: string) {
        return fs
          .access(targetPath)
          .then(() => true)
          .catch(() => false);
      }

      async function ensureFolder(targetPath: string) {
        try {
          await fs.mkdir(targetPath, { recursive: true });
          return true;
        } catch (error) {
          console.error(`Failed to create directory ${targetPath}:`, error);
          return false;
        }
      }

      // Check if folder exists, if not create it
      if (!(await checkFolder(collectionDir))) {
        const created = await ensureFolder(collectionDir);
        if (!created) {
          throw new Error(
            `Failed to create collection directory: ${collectionDir}`
          );
        }
      }

      const startJob = execa("dvgrab", [], {
        cwd: collectionDir,
      });

      startJob.stdout?.on("data", async (data) => {
        const logMessage = data.toString().trim();
        if (logMessage) {
          await db.insert(jobLogs).values({
            jobId: jobId,
            level: "info",
            message: logMessage,
          });
        }
      });

      startJob.stderr?.on("data", async (data) => {
        const logMessage = data.toString().trim();
        if (logMessage) {
          await db.insert(jobLogs).values({
            jobId: jobId,
            level: "error",
            message: logMessage,
          });
        }
      });

      startJob.on("exit", async (code) => {
        const status = code === 0 ? "completed" : "failed";
        await db
          .update(jobs)
          .set({ status, progress: 100 })
          .where(eq(jobs.collectionId, collectionId));

        await db.insert(jobLogs).values({
          jobId: jobId,
          level: code === 0 ? "info" : "error",
          message: `Process exited with code ${code}`,
        });
      });

      startJob.catch(async (error) => {
        await db
          .update(jobs)
          .set({ status: "failed" })
          .where(eq(jobs.collectionId, collectionId));

        await db.insert(jobLogs).values({
          jobId: jobId,
          level: "error",
          message: `Process failed: ${error.message}`,
        });
      });

      return {
        success: true,
        message: `Job started for collection '${collectionName}'`,
      };
    }),

  getStatus: baseProcedure.query(async ({ ctx }) => {
    const { db } = ctx;

    const jobResults = await db
      .select({
        id: jobs.id,
        collectionId: jobs.collectionId,
        status: jobs.status,
        progress: jobs.progress,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        collectionName: collections.name,
      })
      .from(jobs)
      .leftJoin(collections, eq(jobs.collectionId, collections.id))
      .orderBy(desc(jobs.createdAt));

    if (!jobResults.length) {
      return {
        hasJobs: false,
        jobs: [],
      };
    }

    const allJobIds = jobResults.map((job) => job.id);
    const allLogs = await db
      .select()
      .from(jobLogs)
      .where(inArray(jobLogs.jobId, allJobIds))
      .orderBy(jobLogs.createdAt);

    const logsByJobId = new Map();
    allLogs.forEach((log) => {
      if (!logsByJobId.has(log.jobId)) {
        logsByJobId.set(log.jobId, []);
      }
      logsByJobId.get(log.jobId).push(log);
    });

    const jobsWithLogs = jobResults.map((job) => ({
      hasJob: true,
      status: job.status,
      progress: job.progress,
      logs: logsByJobId.get(job.id) || [],
      jobId: job.id,
      collectionId: job.collectionId,
      collectionName: job.collectionName,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));

    return {
      hasJobs: true,
      jobs: jobsWithLogs,
    };
  }),

  cancel: baseProcedure
    .input(
      z.object({
        jobId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { jobId } = input;

      await db
        .update(jobs)
        .set({ status: "cancelled", progress: 100 })
        .where(eq(jobs.id, jobId));

      await db.insert(jobLogs).values({
        jobId: jobId,
        level: "info",
        message: "Job cancelled by user",
      });

      return {
        success: true,
        message: "Job cancelled successfully",
      };
    }),
});
