import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clips = pgTable("clips", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  duration: varchar("duration", { length: 50 }),
  fileSize: varchar("file_size", { length: 50 }),
  isProcessed: boolean("is_processed").default(false).notNull(),
  userId: integer("user_id").references(() => users.id),
  collectionId: integer("collection_id").references(() => collections.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const captureJobs = pgTable("capture_jobs", {
  id: varchar("id", { length: 255 }).primaryKey(), // UUID-like string
  collectionId: integer("collection_id").references(() => collections.id).notNull(),
  collectionName: varchar("collection_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // starting, running, completed, failed, cancelled
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  progress: integer("progress"), // 0-100
  error: text("error"),
  outputPath: text("output_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
