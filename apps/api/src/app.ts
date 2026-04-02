import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { GoogleGenAI } from "@google/genai";
import Fastify from "fastify";
import type { Firestore } from "firebase-admin/firestore";
import type { LLMClient } from "./lib/llm/types";
import type { SessionStore } from "./lib/sessions/types";
import healthRoutes from "./routes/health";
import { chatRoutes, sessionRoutes } from "./routes/index";

declare module "fastify" {
  interface FastifyInstance {
    llm: LLMClient;
    sessions: SessionStore;
    genai: GoogleGenAI;
    firestore?: Firestore;
  }
}

export interface AppOptions {
  llm: LLMClient;
  sessionStore: SessionStore;
  genai: GoogleGenAI;
  firestore?: Firestore;
  corsOrigin?: string;
  logger?: boolean;
  routePrefix: string;
}

export function buildApp(options: AppOptions) {
  const corsOrigin = options.corsOrigin ?? "http://localhost:5173";

  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.decorate("llm", options.llm);
  app.decorate("sessions", options.sessionStore);
  app.decorate("genai", options.genai);
  app.decorate("firestore", options.firestore);

  app.register(cors, {
    origin: corsOrigin,
    credentials: true,
  });

  app.register(cookie);

  const prefix = options.routePrefix;
  app.register(sessionRoutes, { prefix });
  app.register(chatRoutes, { prefix, corsOrigin });
  app.register(healthRoutes, { prefix });

  return app;
}
