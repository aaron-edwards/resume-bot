import type { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app) => {
  const getGitSha = () => {
    if (process.env.NODE_ENV === "development") {
      return "dev";
    }
    return process.env.GIT_SHA ?? "unknown";
  };

  const checkGemini = async (): Promise<{
    status: "healthy" | "unhealthy";
    latency?: number;
  }> => {
    const start = Date.now();
    try {
      // This is a lightweight call to verify API key and connectivity
      await app.genai.models.get({ model: "gemini-pro" });
      return { status: "healthy", latency: Date.now() - start };
    } catch (e) {
      app.log.error(e, "Gemini health check failed");
      return { status: "unhealthy", latency: Date.now() - start };
    }
  };

  const checkFirestore = async (): Promise<{
    status: "healthy" | "unhealthy" | "not_configured";
    latency?: number;
  }> => {
    if (!app.firestore) {
      return { status: "not_configured" }; // Not configured, so not unhealthy
    }
    const start = Date.now();
    try {
      // A simple read to check connectivity and permissions
      await app.firestore.collection("sessions").limit(1).get();
      return { status: "healthy", latency: Date.now() - start };
    } catch (e) {
      app.log.error(e, "Firestore health check failed");
      return { status: "unhealthy", latency: Date.now() - start };
    }
  };

  app.get("/health", async (_req, reply) => {
    const [gemini, firestore] = await Promise.all([checkGemini(), checkFirestore()]);

    const response = {
      buildSha: getGitSha(),
      buildTimestamp: process.env.BUILD_TIMESTAMP || new Date().toISOString(),
      dependencies: {
        gemini,
        firestore,
      },
    };

    return reply.send(response);
  });
};

export default healthRoutes;
