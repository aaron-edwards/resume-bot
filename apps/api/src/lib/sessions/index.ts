import { firestoreSessionStore } from "./firestore.js";
import { memorySessionStore } from "./memory.js";
import type { SessionStore } from "./types.js";

const store = process.env.SESSION_STORE ?? "memory";

const stores: Record<string, SessionStore> = {
  memory: memorySessionStore,
  firestore: firestoreSessionStore,
};

export const sessionStore: SessionStore = stores[store] ?? memorySessionStore;
