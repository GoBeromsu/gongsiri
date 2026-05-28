/**
 * searchNews.ts — executeSearchNews + searchNewsTool (AC-03, AC-28)
 * 실제 구현은 global fetch + env var AGENT_BACKEND_URL 사용 — mock HTTP 서버로 테스트.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { SEARCH_NEWS_TOOL_NAME } from "../../dist/contracts/tool.js";

function startMockServer(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function withMockServer(handler, fn) {
  const { server, port } = await startMockServer(handler);
  const origEnv = process.env.AGENT_BACKEND_URL;
  process.env.AGENT_BACKEND_URL = `http://127.0.0.1:${port}`;
  try {
    return await fn(port);
  } finally {
    if (origEnv === undefined) delete process.env.AGENT_BACKEND_URL;
    else process.env.AGENT_BACKEND_URL = origEnv;
    await stopServer(server);
  }
}

const SUCCESS_BODY = {
  ok: true,
  items: [
    {
      title: "카카오 주가 급등",
      link: "https://news.example.com/1",
      pubDate: "2026-01-01",
    },
  ],
};

test("executeSearchNews returns success on HTTP 200", async () => {
  const { executeSearchNews } = await import("../../dist/tools/searchNews.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(SUCCESS_BODY));
    },
    async () => executeSearchNews({ query: "카카오 공시" }),
  );
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.items));
  assert.equal(result.items.length, 1);
});

test("executeSearchNews HTTP 500 → failure", async () => {
  const { executeSearchNews } = await import("../../dist/tools/searchNews.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(500);
      res.end();
    },
    async () => executeSearchNews({ query: "카카오 공시" }),
  );
  assert.equal(result.ok, false);
});

test("executeSearchNews HTTP 404 → failure", async () => {
  const { executeSearchNews } = await import("../../dist/tools/searchNews.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(404);
      res.end();
    },
    async () => executeSearchNews({ query: "카카오 공시" }),
  );
  assert.equal(result.ok, false);
});

test("executeSearchNews connection refused → failure", async () => {
  const { executeSearchNews } = await import("../../dist/tools/searchNews.js");
  const origEnv = process.env.AGENT_BACKEND_URL;
  process.env.AGENT_BACKEND_URL = "http://127.0.0.1:1";
  try {
    const result = await executeSearchNews({ query: "카카오 공시" });
    assert.equal(result.ok, false);
  } finally {
    if (origEnv === undefined) delete process.env.AGENT_BACKEND_URL;
    else process.env.AGENT_BACKEND_URL = origEnv;
  }
});

test("searchNewsTool has correct wire name", async () => {
  const { searchNewsTool } = await import("../../dist/tools/searchNews.js");
  assert.equal(searchNewsTool.name, SEARCH_NEWS_TOOL_NAME);
});

test("searchNewsTool.execute returns content array on success", async () => {
  const { searchNewsTool } = await import("../../dist/tools/searchNews.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(SUCCESS_BODY));
    },
    async () =>
      searchNewsTool.execute("tool-call-id", { query: "카카오 공시" }),
  );
  assert.ok(Array.isArray(result.content));
  const parsed = JSON.parse(result.content[0].text);
  assert.equal(parsed.ok, true);
});
