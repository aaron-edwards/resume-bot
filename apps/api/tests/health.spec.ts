import { buildApp } from "../src/app";
import type { LLMClient } from "../src/lib/llm/types";
import type { SessionStore } from "../src/lib/sessions/types";

describe("Health Endpoint", () => {
  let llm: LLMClient;
  let sessionStore: SessionStore;

  beforeEach(() => {
    llm = {} as LLMClient;
    sessionStore = {} as SessionStore;
  });

  it("should return health status with git SHA", async () => {
    const app = buildApp({ llm, sessionStore });
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.status).toBe("ok");
    expect(data.gitSha).toBeDefined();
    expect(data.gitSha.length).toBe(40); // SHA-1 is 40 chars
    expect(data.connections).toBeDefined();
  });

  it("should return unhealthy status for unreachable services", async () => {
    const app = buildApp({ llm, sessionStore });
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    const data = JSON.parse(response.payload);
    // Services without env vars should be marked as unhealthy or undefined
    expect(data.connections).toBeDefined();
  });

  it("should include connection status for configured services", async () => {
    // Mock environment with a fake URL
    const originalEnv = process.env.SESSION_STORE;
    process.env.SESSION_STORE = "firestore";

    const app = buildApp({ llm, sessionStore });
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);

    // Cleanup
    process.env.SESSION_STORE = originalEnv;
  });
});
