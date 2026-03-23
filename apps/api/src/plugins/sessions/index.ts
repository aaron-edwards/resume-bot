import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { SessionStore } from "./types.js";

declare module "fastify" {
  interface FastifyInstance {
    sessions: SessionStore;
  }
}

const sessionsPlugin: FastifyPluginAsync<{ store: SessionStore }> = async (fastify, opts) => {
  fastify.decorate("sessions", opts.store);
};

export default fp<{ store: SessionStore }>(sessionsPlugin, { name: "sessions" });
export type { SessionStore };
