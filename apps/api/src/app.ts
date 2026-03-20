import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { chatRoutes } from "./routes/chat.js";

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });

  app.register(cookie);

  app.register(rateLimit, {
    max: 5,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(chatRoutes);

  return app;
}
