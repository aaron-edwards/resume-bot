import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import type { LLMClient } from "./lib/llm/types";
import type { SessionStore } from "./lib/sessions/types";
import { chatRoutes, sessionRoutes } from "./routes/index";

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
  routePrefix?: string;
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

  async function checkExternalService(url: string): Promise<{ status: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      await fetch(url, { method: "HEAD", timeout: 5000 });
      const latency = Date.now() - start;
      return { status: "healthy", latencyMs: latency };
    } catch (err) {
      return { status: "unhealthy" };
    }
  }

  app.get("/health", async () => {
    const gitSha = await new Promise((resolve, reject) => {
      const { execSync } = require("child_process");
      try {
        const sha = execSync("git rev-parse HEAD", { cwd: process.cwd() });
        resolve(sha.toString().trim());
      } catch (err) {
        reject(err);
      }
    });

    const healthData = { status: "ok", gitSha, connections: {} };

    // Check external services
    if (process.env.GEMINI_API_KEY) {
      healthData.connections.gemini = await checkExternalService("https://generativelanguage.googleapis.com");
    }

    // Check Firestore (if configured)
    if (process.env.SESSION_STORE === "firestore") {
      healthData.connections.firestore = await checkExternalService("https://firestore.googleapis.com");
    }

    // Check Redis if configured
    if (process.env.REDIS_URL) {
      healthData.connections.redis = await checkExternalService(process.env.REDIS_URL);
    }

    return healthData;
  });

  const prefix = options.routePrefix ?? "";
  app.register(sessionRoutes, { prefix });
  app.register(chatRoutes, { prefix, corsOrigin });

  return app;
}
