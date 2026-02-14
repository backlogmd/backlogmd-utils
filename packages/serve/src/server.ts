import Fastify from "fastify";
import path from "node:path";
import { renderHtml } from "./html.js";
import {
  getCore,
  errorOutput,
  manifestToOutput,
  type ServerContext,
  reloadCore,
  VALID_STATUSES,
  CoreManager,
} from "./core.js";
import type { Server } from "node:http";
import type { TaskStatus } from "@backlogmd/types";
import type { ServerResponse } from "node:http";

export { reloadCore };

export interface ServerResult {
  server: Server;
  notifyClients: () => void;
  close: () => void;
}

export function createServer(port: number, backlogDir: string): ServerResult {
  const coreManager = new CoreManager();

  const absBacklogDir = path.resolve(backlogDir);
  const context: ServerContext = {
    backlogDir,
    absBacklogDir,
  };

  const fastify = Fastify({
    logger: false,
  });

  const clients = new Set<ServerResponse>();
  const chatClients = new Set<ServerResponse>();

  const notifyClients = () => {
    const message = "data: reload\n\n";
    for (const client of clients) {
      client.write(message);
    }
  };

  const notifyClientsWithError = (errorMessage: string) => {
    const message = `data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`;
    for (const client of clients) {
      client.write(message);
    }
  };

  const notifyChatClients = (data: unknown) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of chatClients) {
      client.write(message);
    }
  };

  fastify.get("/", async (request, reply) => {
    try {
      const core = await getCore(coreManager, backlogDir);
      const manifest = core.getManifest();
      const output = manifestToOutput(manifest, absBacklogDir);
      const html = renderHtml(output);
      reply.type("text/html").send(html);
    } catch (err) {
      fastify.log.error({ err }, "Load error");
      const output = errorOutput(absBacklogDir, (err as Error).message);
      const html = renderHtml(output);
      reply.type("text/html").send(html);
    }
  });

  fastify.get("/index.html", async (request, reply) => {
    try {
      const core = await getCore(coreManager, backlogDir);
      const manifest = core.getManifest();
      const output = manifestToOutput(manifest, absBacklogDir);
      const html = renderHtml(output);
      reply.type("text/html").send(html);
    } catch (err) {
      fastify.log.error({ err }, "Load error");
      const output = errorOutput(absBacklogDir, (err as Error).message);
      const html = renderHtml(output);
      reply.type("text/html").send(html);
    }
  });

  fastify.get("/api/backlog", async (request, reply) => {
    try {
      const core = await getCore(coreManager, backlogDir);
      const manifest = core.getManifest();
      const output = manifestToOutput(manifest, absBacklogDir);
      return output;
    } catch (err) {
      fastify.log.error({ err }, "Load error");
      const output = errorOutput(absBacklogDir, (err as Error).message);
      reply.status(200).send(output);
    }
  });

  fastify.get("/api/backlog.json", async (request, reply) => {
    try {
      const core = await getCore(coreManager, backlogDir);
      const manifest = core.getManifest();
      const output = manifestToOutput(manifest, absBacklogDir);
      reply.type("application/json").send(output);
    } catch (err) {
      fastify.log.error({ err }, "Load error");
      const output = errorOutput(absBacklogDir, (err as Error).message);
      reply.type("application/json").send(output);
    }
  });

  fastify.get("/api/tasks", async (request, reply) => {
    try {
      const core = await getCore(coreManager, backlogDir);
      const manifest = core.getManifest();
      const output = {
        tasks: manifest.items.flatMap((item) =>
          item.tasks.map((t) => ({
            name: t.t,
            status: t.s,
            priority: t.p,
            tid: t.tid,
            slug: t.slug.replace(/^\d+-/, ""),
            itemSlug: item.slug,
            dependsOn: t.dep,
            agent: t.a,
            humanReview: t.h,
            expiresAt: t.expiresAt,
            description: "",
            acceptanceCriteria: [],
            source: `${item.path}/${t.file}`,
          })),
        ),
      };
      return output;
    } catch (err) {
      fastify.log.error({ err }, "Load error");
      return { tasks: [], error: (err as Error).message };
    }
  });

  fastify.patch<{ Params: { source: string } }>("/api/tasks/:source", async (request, reply) => {
    try {
      const taskSource = decodeURIComponent(request.params.source);

      if (!taskSource) {
        return reply.status(400).send({ error: "Missing task source" });
      }

      if (!request.body || typeof request.body !== "object") {
        return reply.status(400).send({ error: "Invalid JSON body" });
      }

      const { status } = request.body as { status?: string };
      if (!status || !VALID_STATUSES.has(status)) {
        return reply.status(400).send({
          error: `Invalid status "${status}". Must be one of: ${[...VALID_STATUSES].join(", ")}`,
        });
      }

      const core = await getCore(coreManager, backlogDir);
      await core.updateTaskStatus(taskSource, status as TaskStatus);
      await reloadCore(coreManager);
      notifyClients();
      return { ok: true };
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      fastify.log.error({ err }, "PATCH error");
      return reply.status(500).send({ error: message });
    }
  });

  fastify.get("/api/task", async (request, reply) => {
    try {
      const taskSource = (request.query as { source?: string }).source;

      if (!taskSource) {
        return reply.status(400).send({ error: "Missing task source" });
      }

      const core = await getCore(coreManager, backlogDir);
      const content = await core.getTaskContent(taskSource);
      return content;
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      fastify.log.error({ err }, "GET task error");
      return reply.status(500).send({ error: message });
    }
  });

  fastify.put("/api/task", async (request, reply) => {
    try {
      const taskSource = (request.query as { source?: string }).source;

      if (!taskSource) {
        return reply.status(400).send({ error: "Missing task source" });
      }

      if (!request.body || typeof request.body !== "object") {
        return reply.status(400).send({ error: "Invalid JSON body" });
      }

      const { title, description, acceptanceCriteria } = request.body as {
        title?: string;
        description?: string;
        acceptanceCriteria?: { text: string; checked: boolean }[];
      };

      const updates: {
        title?: string;
        description?: string;
        acceptanceCriteria?: { text: string; checked: boolean }[];
      } = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (acceptanceCriteria !== undefined) updates.acceptanceCriteria = acceptanceCriteria;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: "No updates provided" });
      }

      const core = await getCore(coreManager, backlogDir);
      await core.updateTaskContent(taskSource, updates);
      await reloadCore(coreManager);
      notifyClients();
      return { ok: true };
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      fastify.log.error({ err }, "PUT task error");
      return reply.status(500).send({ error: message });
    }
  });

  fastify.delete<{ Params: { source: string } }>("/api/tasks/:source", async (request, reply) => {
    try {
      const taskSource = decodeURIComponent(request.params.source);

      if (!taskSource) {
        return reply.status(400).send({ error: "Missing task source" });
      }

      const core = await getCore(coreManager, backlogDir);
      await core.removeTask(taskSource);
      await reloadCore(coreManager);
      notifyClients();
      return { ok: true };
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      fastify.log.error({ err }, "DELETE error");
      return reply.status(500).send({ error: message });
    }
  });

  fastify.delete<{ Params: { itemSlug: string } }>(
    "/api/work/:itemSlug",
    async (request, reply) => {
      try {
        const itemSlug = decodeURIComponent(request.params.itemSlug);

        if (!itemSlug) {
          return reply.status(400).send({ error: "Missing item slug" });
        }

        const core = await getCore(coreManager, backlogDir);
        await core.removeItem(itemSlug);
        await reloadCore(coreManager);
        notifyClients();
        return { ok: true };
      } catch (err) {
        const message = (err as Error).message;
        if (message.includes("not found")) {
          return reply.status(404).send({ error: message });
        }
        fastify.log.error({ err }, "DELETE work error");
        return reply.status(500).send({ error: message });
      }
    },
  );

  fastify.patch<{ Params: { itemSlug: string } }>(
    "/api/work/:itemSlug/reset",
    async (request, reply) => {
      const itemSlug = decodeURIComponent(request.params.itemSlug);

      if (!itemSlug) {
        return reply.status(400).send({ error: "Missing item slug" });
      }

      try {
        const core = await getCore(coreManager, backlogDir);
        await core.resetItemTasks(itemSlug);
        await reloadCore(coreManager);
        notifyClients();
        return { ok: true };
      } catch (err) {
        const message = (err as Error).message;
        fastify.log.error({ err, itemSlug }, "PATCH /api/work/:itemSlug/reset error");
        if (message.includes("not found")) {
          return reply.status(404).send({ error: message });
        }
        return reply.status(500).send({ error: `Failed to reset: ${message}` });
      }
    },
  );

  fastify.post<{ Body: { title?: unknown; description?: unknown } }>(
    "/api/work",
    async (request, reply) => {
      const { title, description } = request.body || {};

      if (!title || typeof title !== "string") {
        return reply.status(400).send({ error: "Missing or invalid 'title' field" });
      }

      try {
        const core = await getCore(coreManager, backlogDir);
        const newItem = await core.addItem({ title });
        const itemSlug = newItem.items[newItem.items.length - 1].slug;

        if (description && typeof description === "string") {
          await core.addTask(itemSlug, { title: description, priority: 1 });
        }

        await reloadCore(coreManager);
        notifyClients();

        return reply.status(201).send({ ok: true, itemSlug });
      } catch (err) {
        fastify.log.error({ err }, "POST /api/work error");
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );

  fastify.post<{ Body: { itemSlug?: unknown; title?: unknown; description?: unknown } }>(
    "/api/tasks",
    async (request, reply) => {
      const { itemSlug, title, description } = request.body || {};

      if (!itemSlug || typeof itemSlug !== "string") {
        return reply.status(400).send({ error: "Missing or invalid 'itemSlug' field" });
      }
      if (!title || typeof title !== "string") {
        return reply.status(400).send({ error: "Missing or invalid 'title' field" });
      }

      try {
        const core = await getCore(coreManager, backlogDir);
        await core.addTask(itemSlug, { title, description: description as string | undefined });

        await reloadCore(coreManager);
        notifyClients();

        return reply.status(201).send({ ok: true });
      } catch (err) {
        fastify.log.error({ err }, "POST /api/tasks error");
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );

  fastify.get("/api/plan", async () => {
    return {};
  });

  let serverPort = port;

  fastify.post<{ Body: { title?: unknown; description?: unknown } }>(
    "/api/plan",
    async (request, reply) => {
      const { title, description } = request.body || {};

      if (!title || typeof title !== "string") {
        return reply.status(400).send({ error: "Missing or invalid 'title' field" });
      }
      if (!description || typeof description !== "string") {
        return reply.status(400).send({ error: "Missing or invalid 'description' field" });
      }

      try {
        const core = await getCore(coreManager, backlogDir);
        const itemTitle = `Plan: ${title}`;
        const result = await core.addItem({ title: itemTitle });
        const itemSlug = result.items[result.items.length - 1].slug;

        const taskResult = await core.addTask(itemSlug, {
          title: description,
          status: "plan",
          priority: 1,
        });
        const taskId = taskResult.items[taskResult.items.length - 1].tasks[0].tid;

        setTimeout(async () => {
          try {
            const { BacklogCore } = await import("@backlogmd/core");
            const { Autopilot, OpenCodeAgent } = await import("@backlogmd/autopilot");
            fastify.log.info({ taskId }, "Starting autopilot execution");
            const autopilotCore = await BacklogCore.load({
              rootDir: backlogDir,
              autoReconcile: false,
            });
            const webhookUrl = `http://localhost:${serverPort}/api/chat/message`;
            const cwd = path.dirname(backlogDir);
            const agent = new OpenCodeAgent(webhookUrl, cwd);
            const autopilot = new Autopilot(autopilotCore, agent);
            await autopilot.runPlanTask(taskId);
            notifyClients();
            fastify.log.info({ taskId }, "Autopilot execution completed");
          } catch (err) {
            fastify.log.error({ err }, "Autopilot execution failed");
          }
        }, 100);

        await reloadCore(coreManager);
        notifyClients();

        return reply.status(201).send({ ok: true, itemSlug });
      } catch (err) {
        fastify.log.error({ err }, "POST /api/plan error");
        return reply.status(500).send({ error: (err as Error).message });
      }
    },
  );

  fastify.post<{ Body: { message?: unknown } }>("/api/chat/message", async (request, reply) => {
    const { message } = request.body || {};

    if (!message || typeof message !== "string") {
      return reply.status(400).send({ error: "Missing or invalid 'message' field" });
    }

    notifyChatClients({ type: "message", content: message });
    return { ok: true };
  });

  fastify.post<{ Body: { message?: unknown } }>("/api/chat", async (request, reply) => {
    const { message } = request.body || {};

    if (!message || typeof message !== "string") {
      return reply.status(400).send({ error: "Missing or invalid 'message' field" });
    }

    setTimeout(async () => {
      try {
        const { BacklogCore } = await import("@backlogmd/core");
        const { Autopilot, OpenCodeAgent } = await import("@backlogmd/autopilot");
        fastify.log.info("Direct autopilot execution");
        const autopilotCore = await BacklogCore.load({
          rootDir: backlogDir,
          autoReconcile: false,
        });
        const webhookUrl = `http://localhost:${serverPort}/api/chat/message`;
        const cwd = path.dirname(backlogDir);
        const agent = new OpenCodeAgent(webhookUrl, cwd);
        const autopilot = new Autopilot(autopilotCore, agent);
        await autopilot.executePrompt(message);
        notifyClients();
        fastify.log.info("Direct autopilot execution completed");
      } catch (err) {
        fastify.log.error({ err }, "Direct autopilot execution failed");
      }
    }, 100);

    return { response: "Executing..." };
  });

  fastify.get("/events", async (request, reply) => {
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");
    clients.add(res);
    request.raw.on("close", () => {
      clients.delete(res);
    });
  });

  fastify.get("/events/chat", async (request, reply) => {
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");
    chatClients.add(res);
    request.raw.on("close", () => {
      chatClients.delete(res);
    });
  });

  fastify.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    fastify.log.error({ err: error }, "Request error");
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 400 || error.message?.includes("JSON")) {
      return reply.status(400).send({ error: "Invalid JSON" });
    }
    reply.status(404).send({ error: "Not Found" });
  });

  fastify.listen({ port }, (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    if (address) {
      const parsed = new URL(address);
      serverPort = parseInt(parsed.port, 10) || port;
    }
  });

  const close = async () => {
    for (const client of clients) {
      client.end();
    }
    clients.clear();
    for (const client of chatClients) {
      client.end();
    }
    chatClients.clear();
    await fastify.close();
  };

  return {
    server: fastify.server,
    notifyClients: async () => {
      try {
        await reloadCore(coreManager);
        notifyClients();
      } catch (err) {
        fastify.log.error({ err }, "Error reloading core in notifyClients");
        notifyClientsWithError((err as Error).message);
      }
    },
    close,
  };
}
