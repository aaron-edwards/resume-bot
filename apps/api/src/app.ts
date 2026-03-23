import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import type { LlmInterface } from "./plugins/llm/index.js";
import llmPlugin from "./plugins/llm/index.js";
import sessionsPlugin from "./plugins/sessions/index.js";
import type { SessionStore } from "./plugins/sessions/index.js";
import { chatRoutes, sessionRoutes } from "./routes/index.js";

export interface AppOptions {
  llm: LlmInterface;
  sessionStore: SessionStore;
  corsOrigin?: string;
  logger?: boolean;
}

export function buildApp(options: AppOptions) {
  const corsOrigin = options.corsOrigin ?? "http://localhost:5173";

  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.register(llmPlugin, { llm: options.llm });
  app.register(sessionsPlugin, { store: options.sessionStore });

  app.register(cors, {
    origin: corsOrigin,
    credentials: true,
  });

  app.register(cookie);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.register(sessionRoutes);
  app.register(chatRoutes, { corsOrigin });

  return app;
}
