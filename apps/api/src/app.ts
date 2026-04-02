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

  app.get("/health", async (_req, reply) => {
    const { exec } = await import("node:child_process");

    const getGitSha = () =>
      new Promise<string>((resolve, reject) => {
        exec("git rev-parse HEAD", (error, stdout) => {
          if (error) {
            return reject(error);
          }
          resolve(stdout.toString().trim());
        });
      });

    const checkDependency = async (
      url: string
    ): Promise<{ status: "healthy" | "unhealthy"; latency?: number }> => {
      const startTime = Date.now();
      try {
        const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error("unhealthy");
        return { status: "healthy", latency: Date.now() - startTime };
      } catch (e) {
        return { status: "unhealthy" };
      }
    };

    const [gitSha, gemini, firestore] = await Promise.all([
      getGitSha().catch(() => "unknown"),
      checkDependency("https://generativelanguage.googleapis.com"),
      checkDependency("https://firestore.googleapis.com"),
    ]);

    const response = {
      buildSha: gitSha,
      dependencies: {
        gemini,
        firestore,
      },
    };

    return reply.send(response);
  });

  const prefix = options.routePrefix ?? "";
  app.register(sessionRoutes, { prefix });
  app.register(chatRoutes, { prefix, corsOrigin });

  return app;
}
