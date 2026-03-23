import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { firestoreSessionStore } from "./firestore.js";
import { memorySessionStore } from "./memory.js";
import type { SessionStore } from "./types.js";

declare module "fastify" {
  interface FastifyInstance {
    sessions: SessionStore;
  }
}

const sessionsPlugin: FastifyPluginAsync = async (fastify) => {
  const store =
    process.env.SESSION_STORE === "firestore" ? firestoreSessionStore : memorySessionStore;
  fastify.decorate("sessions", store);
};

export default fp(sessionsPlugin, { name: "sessions" });
export type { SessionStore };
