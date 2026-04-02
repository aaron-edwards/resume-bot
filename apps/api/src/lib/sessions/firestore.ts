import type { ChatMessage } from "@repo/types";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, type Firestore, getFirestore } from "firebase-admin/firestore";
import type { SessionStore } from "./types";

let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!db) {
    initializeApp();
    db = getFirestore();
  }
  return db;
}

export const firestoreSessionStore: SessionStore = {
  async getSession(sessionId) {
    const doc = await getDb().collection("sessions").doc(sessionId).get();
    const data = doc.data();
    return {
      messages: (data?.messages as ChatMessage[]) ?? [],
      userName: data?.userName as string | undefined,
    };
  },

  async saveSession(sessionId, messages: ChatMessage[], userName?: string, ip?: string) {
    const ref = getDb().collection("sessions").doc(sessionId);
    const doc = await ref.get();

    if (!doc.exists) {
      await ref.set({
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        messages,
        ...(userName !== undefined && { userName }),
        ...(ip !== undefined && { ip }),
      });
    } else {
      await ref.update({
        updatedAt: FieldValue.serverTimestamp(),
        messages,
        ...(userName !== undefined && { userName }),
      });
    }
  },
};
