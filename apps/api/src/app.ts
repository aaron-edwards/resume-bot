import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import llmPlugin from "./plugins/llm/index.js";
import sessionsPlugin from "./plugins/sessions/index.js";
import { chatRoutes } from "./routes/chat.js";
import { sessionRoutes } from "./routes/index.js";

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  app.register(llmPlugin);
  app.register(sessionsPlugin);

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
