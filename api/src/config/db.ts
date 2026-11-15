import mongoose from "mongoose";
import { env } from "./env";

export type DatabaseStatus = "connected" | "connecting" | "disconnected" | "not configured";

/**
 * Connects to MongoDB. Returns true when connected.
 *
 * In development the API still starts without a database, so you can see the
 * site working before MongoDB Atlas is set up. In production a failed
 * connection stops the server (see server.ts).
 */
export async function connectDatabase(): Promise<boolean> {
  if (!env.mongodbUri) {
    console.warn("MONGODB_URI is not set. The API is running without a database.");
    return false;
  }

  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 8000 });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`MongoDB connection failed: ${reason}`);
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function databaseStatus(): DatabaseStatus {
  if (!env.mongodbUri) return "not configured";

  switch (mongoose.connection.readyState) {
    case mongoose.ConnectionStates.connected:
      return "connected";
    case mongoose.ConnectionStates.connecting:
      return "connecting";
    default:
      return "disconnected";
  }
}
