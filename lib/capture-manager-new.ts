import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";
import { db } from "@/db";
import { eq } from "drizzle-orm";

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
