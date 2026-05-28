/**
 * fetchDisclosures.ts — executeFetchDisclosures() 직접 호출 + fetchDisclosuresTool.execute() SDK 호출 양쪽 검증
 * (AC-28, AC-30, E11 migration)
 */
import test from "node:test";
import assert from "node:assert/strict";

import { FETCH_DISCLOSURES_TOOL_NAME } from "../../dist/contracts/tool.js";

const makeResponse = (status, bodyObject) => ({
  ok: status >= 200 && status < 300,
  status,
  async text() {
    return typeof bodyObject === "string"
      ? bodyObject
      : JSON.stringify(bodyObject);
  },
});

const SUCCESS_BODY = {
  ok: true,
  traceId: "fd-trace",
  contractVersion: "v2",
  observedAt: "2026-05-28T12:00:00Z",
  data: {
    corpCode: "00258801",
    company: {
      corp_name: "카카오",
      stock_code: "035720",
      corp_code: "00258801",
      market: "KOSPI",
    },
    disclosures: [],
  },
  evidence: [],
};

// executeFetchDisclosures() — plain async function path (direct callers: trigger/cron)
test("executeFetchDisclosures returns success on valid backend response", async () => {
  const { executeFetchDisclosures } =
    await import("../../dist/tools/fetchDisclosures.js");
  const result = await executeFetchDisclosures(
    { keyword: "카카오", traceId: "fd-trace" },
    {
      backendUrl: "http://backend.test:8000",
      fetchImpl: async () => makeResponse(200, SUCCESS_BODY),
    },
  );
  assert.equal(result.ok, true);
  assert.equal(result.traceId, "fd-trace");
  assert.equal(result.data.corpCode, "00258801");
});

test("executeFetchDisclosures maps malformed body to bridge_malformed_output", async () => {
  const { executeFetchDisclosures } =
    await import("../../dist/tools/fetchDisclosures.js");
  const result = await executeFetchDisclosures(
    { corpCode: "00126380", traceId: "malformed-trace" },
    {
      backendUrl: "http://backend.test:8000",
      fetchImpl: async () => makeResponse(200, "not-json"),
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "bridge_malformed_output");
});

test("executeFetchDisclosures maps fetch throw to bridge_process_failed", async () => {
  const { executeFetchDisclosures } =
    await import("../../dist/tools/fetchDisclosures.js");
  const result = await executeFetchDisclosures(
    { corpCode: "00126380", traceId: "throw-trace" },
    {
      backendUrl: "http://backend.test:8000",
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    },
  );
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "bridge_process_failed");
});

// fetchDisclosuresTool.execute() — SDK-shaped call path (AC-28)
test("fetchDisclosuresTool has correct wire name", async () => {
  const { fetchDisclosuresTool } =
    await import("../../dist/tools/fetchDisclosures.js");
  assert.equal(fetchDisclosuresTool.name, FETCH_DISCLOSURES_TOOL_NAME);
});

test("fetchDisclosuresTool.execute returns content array on success", async () => {
  const { fetchDisclosuresTool } =
    await import("../../dist/tools/fetchDisclosures.js");

  // SDK execute calls executeFetchDisclosures(params) without options — use env var + mock server
  const { createServer } = await import("node:http");
  const server = createServer((req, res) => {
    req.resume();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(SUCCESS_BODY));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const origEnv = process.env.AGENT_BACKEND_URL;
  process.env.AGENT_BACKEND_URL = `http://127.0.0.1:${port}`;
  try {
    const sdkResult = await fetchDisclosuresTool.execute("sdk-call-id", {
      keyword: "카카오",
      traceId: "sdk-trace",
    });
    assert.ok(Array.isArray(sdkResult.content));
    assert.ok(sdkResult.content.length >= 1);
    const parsed = JSON.parse(sdkResult.content[0].text);
    assert.equal(parsed.ok, true);
  } finally {
    if (origEnv === undefined) delete process.env.AGENT_BACKEND_URL;
    else process.env.AGENT_BACKEND_URL = origEnv;
    await new Promise((resolve) => server.close(resolve));
  }
});

test("fetchDisclosuresTool.execute returns failure content on error", async () => {
  const { fetchDisclosuresTool } =
    await import("../../dist/tools/fetchDisclosures.js");

  const sdkResult = await fetchDisclosuresTool.execute("sdk-call-err", {
    corpCode: "00126380",
    traceId: "sdk-err-trace",
    _backendUrl: "http://backend.test:8000",
    _fetchImpl: async () => makeResponse(200, "not-json"),
  });

  assert.ok(Array.isArray(sdkResult.content));
  const parsed = JSON.parse(sdkResult.content[0].text);
  assert.equal(parsed.ok, false);
});
