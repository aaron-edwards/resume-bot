import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import type { ChatMessage } from "@repo/types";
import type { SessionStore } from "./types.js";

let db: Firestore | null = null;

function getDb(): Firestore {
  if (!db) {
    initializeApp();
    db = getFirestore();
  }
  return db;
}

export const firestoreSessionStore: SessionStore = {
  async getSession(sessionId) {
    const doc = await getDb().collection("sessions").doc(sessionId).get();
    return (doc.data()?.messages as ChatMessage[]) ?? [];
  },

  async saveSession(sessionId, ipAddress, messages: ChatMessage[]) {
    const ref = getDb().collection("sessions").doc(sessionId);
    const doc = await ref.get();

    if (!doc.exists) {
      await ref.set({
        ipAddress,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        messages,
      });
    } else {
      await ref.update({
        ipAddress,
        updatedAt: FieldValue.serverTimestamp(),
        messages,
      });
    }
  },
};
