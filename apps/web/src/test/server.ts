import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const encoder = new TextEncoder();

export const GREETING = [{ role: "assistant" as const, content: "Hi! I'm Aaron's ResumeBot." }];

function sseStream(chunks: string[]) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

/** Returns a deferred SSE stream and a flush() to release the chunks */
export function deferredStream(chunks: string[]) {
  let flush!: () => void;
  const gate = new Promise<void>((r) => {
    flush = r;
  });
  const stream = new ReadableStream({
    async start(controller) {
      await gate;
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return { stream, flush };
}

/** Overrides the POST /chat handler with a deferred stream. Returns flush() to release it. */
export function mockChatResponse(chunks: string[]) {
  const { stream, flush } = deferredStream(chunks);
  server.use(
    http.post(
      "http://localhost:3001/api/chat",
      () => new HttpResponse(stream, { headers: { "Content-Type": "text/event-stream" } })
    )
  );
  return flush;
}

export const handlers = [
  http.get("http://localhost:3001/api/session", () => HttpResponse.json({ messages: GREETING })),

  http.post("http://localhost:3001/api/session/reset", () =>
    HttpResponse.json({ messages: GREETING })
  ),

  http.post(
    "http://localhost:3001/api/chat",
    () =>
      new HttpResponse(sseStream(["Hello", " world"]), {
        headers: { "Content-Type": "text/event-stream" },
      })
  ),
];

export const server = setupServer(...handlers);
