import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { exec, spawn } from "child_process";
import { tags, collections } from "@/db/schema";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
export const appRouter = createTRPCRouter({
  listDevices: baseProcedure.query(async ({ ctx }) => {
    const command = "dvrescue --status";

    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          resolve({
            success: false,
            error: error.message,
            devices: [],
          });
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          resolve({
            success: false,
            error: stderr.trim(),
            devices: [],
          });
          return;
        }

        console.log(`stdout: ${stdout}`);

        try {
          const output = stdout.trim();
          if (
            output === "" ||
            output.includes("device not found") ||
            output.includes("No devices")
          ) {
            resolve({
              success: true,
              message: "No devices found",
              devices: [],
            });
          } else {
            resolve({
              success: true,
              message: "Devices found",
              devices: output.split("\n").filter((line) => line.trim() !== ""),
              rawOutput: output,
            });
          }
        } catch (parseError) {
          resolve({
            success: false,
            error: `Failed to parse output: ${parseError}`,
            devices: [],
            rawOutput: stdout,
          });
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
  }),
  startCapture: baseProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { collectionId } = input;
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

      const dvrescueProcess = spawn("dvrescue");
      let stdoutData = "";
      let stderrData = "";

      dvrescueProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      dvrescueProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });
      dvrescueProcess.on("close", async (code) => {
        if (code !== 0) {
          console.error(`dvrescue process exited with code ${code}`);
          return {
            success: false,
            error: `dvrescue process failed with code ${code}`,
          };
        }

        console.log("dvrescue output:", stdoutData);
        console.error("dvrescue errors:", stderrData);
      });
      return {
        success: true,
        message: "Capture started",
      };
    }),
});

export type AppRouter = typeof appRouter;
