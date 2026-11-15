import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/db";
import { env } from "./config/env";

async function main() {
  const connected = await connectDatabase();

  // The live site must never run without its database.
  if (!connected && env.isProduction) {
    console.error("Stopping: the API cannot run in production without MongoDB.");
    process.exit(1);
  }

  const server = createApp().listen(env.port, () => {
    console.log(`Mangalya API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // Close connections cleanly when the host stops or restarts the server.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down.`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
