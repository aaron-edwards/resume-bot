import type { ChatMessage } from "@repo/types";
import type { SessionStore } from "./types.js";

type Session = {
  ipAddress: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
};

const store = new Map<string, Session>();

export const memorySessionStore: SessionStore = {
  async getSession(sessionId) {
    return store.get(sessionId)?.messages ?? [];
  },

  async saveSession(sessionId, ipAddress, messages) {
    const existing = store.get(sessionId);
    if (existing) {
      store.set(sessionId, { ...existing, ipAddress, updatedAt: new Date(), messages });
    } else {
      store.set(sessionId, { ipAddress, createdAt: new Date(), updatedAt: new Date(), messages });
    }
  },
};
