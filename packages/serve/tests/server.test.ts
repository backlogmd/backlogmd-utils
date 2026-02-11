import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer } from "../src/server.js";
import path from "node:path";
import http from "node:http";

describe("server", () => {
  let port: number;
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    port = 3000 + Math.floor(Math.random() * 1000);
    const fixturePath = path.resolve(__dirname, "fixtures/happy-path");
    server = createServer(port, fixturePath);
  });

  afterEach(() => {
    server.close();
  });

  it("GET / returns HTML with status 200", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        resolve(res);
      });
      req.on("error", reject);
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
  });

  it("GET /api/backlog returns JSON", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/api/backlog`, (res) => {
        resolve(res);
      });
      req.on("error", reject);
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("GET /events returns text/event-stream", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/events`, (res) => {
        resolve(res);
      });
      req.on("error", reject);
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
  });

  it("returns 404 for unknown routes", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/unknown`, (res) => {
        resolve(res);
      });
      req.on("error", reject);
    });

    expect(res.statusCode).toBe(404);
  });

  it("notifyClients sends reload message to SSE clients", async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(`http://localhost:${port}/events`, (res) => {
        resolve(res);
      });
      req.on("error", reject);
    });

    let data = "";
    res.on("data", (chunk) => {
      data += chunk.toString();
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    server.notifyClients();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(data).toContain("data: reload");
  });
});
