import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { exec, spawn } from "child_process";
import { tags, collections } from "@/db/schema";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { jobRouter } from "./job";

export const appRouter = createTRPCRouter({
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
  CollectionInfo: baseProcedure
    .input(
      z.object({
        collectionId: z.number().min(1, "Collection ID is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db } = ctx;
      const { collectionId } = input;

      const collectionInfoArr = await db
        .select()
        .from(collections)
        .where(eq(collections.id, collectionId));

      const collectionInfo = collectionInfoArr[0];

      if (!collectionInfo) {
        throw new Error("Collection not found");
      }

      return {
        success: true,
        collection: collectionInfo,
      };
    }),
  checkStatus: baseProcedure.query(async () => {
    return new Promise<{
      success: boolean;
      error?: string;
      stderr?: string;
      message?: string;
      stdout?: string;
    }>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: "Command timed out",
          stderr: "dvgrab command did not complete within 5 seconds",
        });
      }, 5000);

      const command = exec("dvgrab", (error, stdout, stderr) => {
        clearTimeout(timeout);
        if (error) {
          if (stderr.includes("dvgrab") || stdout.includes("dvgrab")) {
            resolve({
              success: true,
              message: "dvgrab is available",
              stdout: stdout,
            });
          } else {
            resolve({
              success: false,
              error: error.message,
              stderr: stderr,
            });
          }
        } else {
          resolve({
            success: true,
            message: "dvgrab is available",
            stdout: stdout,
          });
        }
      });
    });
  }),
  jobRouter: jobRouter,
});

export type AppRouter = typeof appRouter;
