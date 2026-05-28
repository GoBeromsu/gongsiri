/**
 * fetchTradeInfo.ts — executeFetchTradeInfo + fetchTradeInfoTool (AC-03, AC-28)
 * 실제 구현은 global fetch + env var AGENT_BACKEND_URL 사용 — mock HTTP 서버로 테스트.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { FETCH_TRADE_INFO_TOOL_NAME } from "../../dist/contracts/tool.js";

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
  price: 85000,
  change_rate: 3.5,
  history: [{ date: "20260101", close: 84000 }],
};

test("executeFetchTradeInfo returns success on HTTP 200", async () => {
  const { executeFetchTradeInfo } =
    await import("../../dist/tools/fetchTradeInfo.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(SUCCESS_BODY));
    },
    async () => executeFetchTradeInfo({ stockCode: "035720", market: "KOSPI" }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.price, 85000);
  assert.equal(result.change_rate, 3.5);
});

test("executeFetchTradeInfo HTTP 503 → failure", async () => {
  const { executeFetchTradeInfo } =
    await import("../../dist/tools/fetchTradeInfo.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(503);
      res.end();
    },
    async () => executeFetchTradeInfo({ stockCode: "035720" }),
  );
  assert.equal(result.ok, false);
});

test("executeFetchTradeInfo HTTP 404 → failure", async () => {
  const { executeFetchTradeInfo } =
    await import("../../dist/tools/fetchTradeInfo.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(404);
      res.end();
    },
    async () => executeFetchTradeInfo({ stockCode: "035720" }),
  );
  assert.equal(result.ok, false);
});

test("executeFetchTradeInfo connection refused → failure", async () => {
  const { executeFetchTradeInfo } =
    await import("../../dist/tools/fetchTradeInfo.js");
  const origEnv = process.env.AGENT_BACKEND_URL;
  process.env.AGENT_BACKEND_URL = "http://127.0.0.1:1";
  try {
    const result = await executeFetchTradeInfo({ stockCode: "035720" });
    assert.equal(result.ok, false);
  } finally {
    if (origEnv === undefined) delete process.env.AGENT_BACKEND_URL;
    else process.env.AGENT_BACKEND_URL = origEnv;
  }
});

test("fetchTradeInfoTool has correct wire name", async () => {
  const { fetchTradeInfoTool } =
    await import("../../dist/tools/fetchTradeInfo.js");
  assert.equal(fetchTradeInfoTool.name, FETCH_TRADE_INFO_TOOL_NAME);
});

test("fetchTradeInfoTool.execute returns content array on success", async () => {
  const { fetchTradeInfoTool } =
    await import("../../dist/tools/fetchTradeInfo.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(SUCCESS_BODY));
    },
    async () =>
      fetchTradeInfoTool.execute("tool-call-id", {
        stockCode: "035720",
        market: "KOSPI",
      }),
  );
  assert.ok(Array.isArray(result.content));
  const parsed = JSON.parse(result.content[0].text);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.price, 85000);
});
