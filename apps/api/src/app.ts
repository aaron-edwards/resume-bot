import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { chatRoutes } from "./routes/chat.js";
import { sessionRoutes } from "./routes/session.js";

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });

  app.register(cookie);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(sessionRoutes);
  app.register(chatRoutes);

  return app;
}
