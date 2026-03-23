import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import type { LLMClient } from "./lib/llm/types.js";
import type { SessionStore } from "./lib/sessions/types.js";
import { chatRoutes, sessionRoutes } from "./routes/index.js";

declare module "fastify" {
  interface FastifyInstance {
    llm: LLMClient;
    sessions: SessionStore;
  }
}

export interface AppOptions {
  llm: LLMClient;
  sessionStore: SessionStore;
  corsOrigin?: string;
  logger?: boolean;
}

export function buildApp(options: AppOptions) {
  const corsOrigin = options.corsOrigin ?? "http://localhost:5173";

  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.decorate("llm", options.llm);
  app.decorate("sessions", options.sessionStore);

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
