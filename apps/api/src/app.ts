import cors from "@fastify/cors";
import Fastify from "fastify";
import { chatRoutes } from "./routes/chat.js";

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(chatRoutes);

  return app;
}
