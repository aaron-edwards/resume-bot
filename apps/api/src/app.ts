import Fastify from "fastify";

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  return app;
}
