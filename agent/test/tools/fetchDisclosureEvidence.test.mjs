/**
 * fetchDisclosureEvidence.ts — executeFetchDisclosureEvidence + fetchDisclosureEvidenceTool (AC-03, AC-28)
 * 실제 구현은 global fetch + env var AGENT_BACKEND_URL 사용 — mock HTTP 서버로 테스트.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME } from "../../dist/contracts/tool.js";

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
      rcept_no: "20260101001234",
      report_nm: "분기보고서",
      rcept_dt: "20260101",
    },
  ],
};

test("executeFetchDisclosureEvidence returns success on HTTP 200", async () => {
  const { executeFetchDisclosureEvidence } =
    await import("../../dist/tools/fetchDisclosureEvidence.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(SUCCESS_BODY));
    },
    async () => executeFetchDisclosureEvidence({ corpCode: "00258801" }),
  );
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.items));
  assert.equal(result.items.length, 1);
});

test("executeFetchDisclosureEvidence HTTP 404 → failure", async () => {
  const { executeFetchDisclosureEvidence } =
    await import("../../dist/tools/fetchDisclosureEvidence.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(404);
      res.end();
    },
    async () => executeFetchDisclosureEvidence({ corpCode: "00258801" }),
  );
  assert.equal(result.ok, false);
});

test("executeFetchDisclosureEvidence HTTP 503 → failure", async () => {
  const { executeFetchDisclosureEvidence } =
    await import("../../dist/tools/fetchDisclosureEvidence.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(503);
      res.end();
    },
    async () => executeFetchDisclosureEvidence({ corpCode: "00258801" }),
  );
  assert.equal(result.ok, false);
});

test("executeFetchDisclosureEvidence connection refused → failure", async () => {
  const { executeFetchDisclosureEvidence } =
    await import("../../dist/tools/fetchDisclosureEvidence.js");
  const origEnv = process.env.AGENT_BACKEND_URL;
  process.env.AGENT_BACKEND_URL = "http://127.0.0.1:1";
  try {
    const result = await executeFetchDisclosureEvidence({
      corpCode: "00258801",
    });
    assert.equal(result.ok, false);
  } finally {
    if (origEnv === undefined) delete process.env.AGENT_BACKEND_URL;
    else process.env.AGENT_BACKEND_URL = origEnv;
  }
});

test("fetchDisclosureEvidenceTool has correct wire name", async () => {
  const { fetchDisclosureEvidenceTool } =
    await import("../../dist/tools/fetchDisclosureEvidence.js");
  assert.equal(
    fetchDisclosureEvidenceTool.name,
    FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME,
  );
});

test("fetchDisclosureEvidenceTool.execute returns content array on success", async () => {
  const { fetchDisclosureEvidenceTool } =
    await import("../../dist/tools/fetchDisclosureEvidence.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(SUCCESS_BODY));
    },
    async () =>
      fetchDisclosureEvidenceTool.execute("tool-call-id", {
        corpCode: "00258801",
      }),
  );
  assert.ok(Array.isArray(result.content));
  const parsed = JSON.parse(result.content[0].text);
  assert.equal(parsed.ok, true);
});
