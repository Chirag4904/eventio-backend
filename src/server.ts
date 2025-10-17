import http from "http";
import app from "./app.ts";
import prisma from "./config/prisma.ts";
import { env } from "./config/env.ts";
import { initSocket } from "./sockets/index.ts";
import { shutdownRedis } from "./config/redis.ts";
import { logger } from "./utils/logger.ts";

const server = http.createServer(app);
const io = initSocket(server, { prisma });

server.listen(env.port, () => {
  logger.info(`🚀 HTTP+Socket server on http://localhost:${env.port}`);
});

async function shutdown() {
  logger.info("Shutting down server...");
  try {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    io.disconnectSockets(true);
    await shutdownRedis();
    await prisma.$disconnect();
  } catch (err) {
    logger.error({ err }, "Error during shutdown");
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
