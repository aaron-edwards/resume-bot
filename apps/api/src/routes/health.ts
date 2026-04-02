import { exec } from "node:child_process";
import type { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app) => {
  const getGitSha = () =>
    process.env.VITE_GIT_SHA
      ? Promise.resolve(process.env.VITE_GIT_SHA)
      : new Promise<string>((resolve) => {
          exec("git rev-parse HEAD", (error, stdout) => {
            if (error) {
              app.log.error(error, "Failed to get git SHA");
              return resolve("unknown");
            }
            resolve(stdout.toString().trim());
          });
        });

  const checkDependency = async (
    url: string
  ): Promise<{ status: "healthy" | "unhealthy"; latency?: number }> => {
    const start = Date.now();
    try {
      const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Dependency check failed with status ${response.status}`);
      return { status: "healthy", latency: Date.now() - start };
    } catch (e) {
      app.log.error(e, `Failed to check dependency: ${url}`);
      return { status: "unhealthy", latency: Date.now() - start };
    }
  };

  app.get("/health", async (_req, reply) => {
    const gitSha = await getGitSha();

    const [gemini, firestore] = await Promise.all([
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
};

export default healthRoutes;
