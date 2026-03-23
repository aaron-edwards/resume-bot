import type { FastifyReply } from "fastify";

export async function serverSideEventStreamWriter(
  reply: FastifyReply,
  writeData: (write: (data: string) => void) => Promise<void>
) {
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader(
    "Access-Control-Allow-Origin",
    process.env.CORS_ORIGIN ?? "http://localhost:5173"
  );
  reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
  reply.raw.flushHeaders();

  try {
    await writeData((data) => reply.raw.write(data));
  } finally {
    reply.raw.end();
  }
}
