import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createDisclosureScheduler } from "../dist/scheduler/disclosureScheduler.js";
import { LocalDisclosureCheckpointStore } from "../dist/state/disclosureCheckpoint.js";
import {
  createDisclosureTriggerRequest,
  runTriggeredDisclosureCheck,
} from "../dist/triggers/disclosureTrigger.js";

// ── mock HTTP 서버 헬퍼 ─────────────────────────────────────────────────────
// runTriggeredDisclosureCheck → executeFetchDisclosures → global fetch + AGENT_BACKEND_URL

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

const makeTempDir = () => mkdtempSync(join(tmpdir(), "gongsiri-trigger-"));
const makeCheckpointPath = () => join(makeTempDir(), "checkpoints.json");

// ── 순수 함수 테스트 (네트워크 불필요) ─────────────────────────────────────

test("createDisclosureTriggerRequest supports only user/system/cron", () => {
  const request = createDisclosureTriggerRequest({
    source: "system",
    keyword: "카카오",
    traceId: "trigger-trace",
    intervalMinutes: 30,
    runReason: "manual verification",
  });

  assert.equal(request.source, "system");
  assert.equal(request.keyword, "카카오");
  assert.equal(request.metadata.intervalMinutes, 30);
  assert.equal(request.traceId, "trigger-trace");
});

// ── 행동 테스트: mock HTTP 서버 사용 ───────────────────────────────────────

test("first successful trigger initializes checkpoint without reporting all disclosures as new", async () => {
  const checkpointPath = makeCheckpointPath();
  const checkpointStore = new LocalDisclosureCheckpointStore(checkpointPath);

  const mockBody = {
    ok: true,
    traceId: "first-run",
    contractVersion: "v1",
    observedAt: "2026-05-20T12:00:00Z",
    data: {
      corpCode: "00258801",
      company: null,
      disclosures: [
        {
          rcept_no: "202605200002",
          report_nm: "사업보고서",
          rcept_dt: "20260520",
        },
        {
          rcept_no: "202605200001",
          report_nm: "분기보고서",
          rcept_dt: "20260520",
        },
      ],
    },
    evidence: [],
  };

  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(mockBody));
    },
    async () =>
      runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "user",
          keyword: "카카오",
          traceId: "first-run",
        }),
        { checkpointStore },
      ),
  );

  assert.equal(result.ok, true);
  assert.equal(result.hasNewDisclosure, false);
  assert.equal(result.newDisclosureCount, 0);
  assert.equal(result.checkpoint.previousLastSeen, null);
  assert.equal(result.checkpoint.currentLastSeen, "202605200002");
  assert.equal(checkpointStore.read("00258801"), "202605200002");
  assert.equal(checkpointStore.read("카카오"), null);
});

test("subsequent successful trigger reports only unseen disclosures", async () => {
  const checkpointPath = makeCheckpointPath();
  const checkpointStore = new LocalDisclosureCheckpointStore(checkpointPath);
  checkpointStore.write("카카오", "202605200002");

  const mockBody = {
    ok: true,
    traceId: "cron-run",
    contractVersion: "v1",
    observedAt: "2026-05-20T12:10:00Z",
    data: {
      corpCode: "00258801",
      company: null,
      disclosures: [
        {
          rcept_no: "202605200004",
          report_nm: "신규 공시",
          rcept_dt: "20260520",
        },
        {
          rcept_no: "202605200003",
          report_nm: "신규 공시",
          rcept_dt: "20260520",
        },
        {
          rcept_no: "202605200002",
          report_nm: "사업보고서",
          rcept_dt: "20260520",
        },
      ],
    },
    evidence: [],
  };

  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(mockBody));
    },
    async () =>
      runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "cron",
          keyword: "카카오",
          traceId: "cron-run",
        }),
        { checkpointStore },
      ),
  );

  assert.equal(result.ok, true);
  assert.equal(result.hasNewDisclosure, true);
  assert.deepEqual(result.newDisclosureIds, ["202605200004", "202605200003"]);
  assert.equal(result.checkpoint.previousLastSeen, "202605200002");
  assert.equal(result.checkpoint.currentLastSeen, "202605200004");
  assert.equal(checkpointStore.read("00258801"), "202605200004");
});

test("failed trigger does not advance checkpoint", async () => {
  const checkpointPath = makeCheckpointPath();
  const checkpointStore = new LocalDisclosureCheckpointStore(checkpointPath);
  checkpointStore.write("카카오", "202605200004");

  const mockBody = {
    ok: false,
    traceId: "failed-run",
    contractVersion: "v1",
    observedAt: "2026-05-20T12:20:00Z",
    error: { code: "missing_env", message: "DART_API_KEY가 .env에 없습니다." },
    evidence: [],
  };

  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(mockBody));
    },
    async () =>
      runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "system",
          keyword: "카카오",
          traceId: "failed-run",
        }),
        { checkpointStore },
      ),
  );

  assert.equal(result.ok, false);
  assert.equal(result.hasNewDisclosure, false);
  assert.equal(checkpointStore.read("카카오"), "202605200004");
});

test("keyword then corpCode runs share the same checkpoint continuity", async () => {
  const checkpointPath = makeCheckpointPath();
  const checkpointStore = new LocalDisclosureCheckpointStore(checkpointPath);

  const firstBody = {
    ok: true,
    traceId: "keyword-first",
    contractVersion: "v1",
    observedAt: "2026-05-20T12:50:00Z",
    data: {
      corpCode: "00258801",
      company: null,
      disclosures: [
        {
          rcept_no: "202605200020",
          report_nm: "사업보고서",
          rcept_dt: "20260520",
        },
      ],
    },
    evidence: [],
  };

  await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(firstBody));
    },
    async () =>
      runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "user",
          keyword: "카카오",
          traceId: "keyword-first",
        }),
        { checkpointStore },
      ),
  );

  const secondBody = {
    ok: true,
    traceId: "corpcode-second",
    contractVersion: "v1",
    observedAt: "2026-05-20T13:00:00Z",
    data: {
      corpCode: "00258801",
      company: null,
      disclosures: [
        {
          rcept_no: "202605200021",
          report_nm: "신규 공시",
          rcept_dt: "20260520",
        },
        {
          rcept_no: "202605200020",
          report_nm: "사업보고서",
          rcept_dt: "20260520",
        },
      ],
    },
    evidence: [],
  };

  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(secondBody));
    },
    async () =>
      runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "cron",
          corpCode: "00258801",
          traceId: "corpcode-second",
        }),
        { checkpointStore },
      ),
  );

  assert.equal(result.ok, true);
  assert.equal(result.checkpoint.previousLastSeen, "202605200020");
  assert.equal(result.hasNewDisclosure, true);
  assert.deepEqual(result.newDisclosureIds, ["202605200021"]);
});

test("corpCode then keyword runs share the same checkpoint continuity", async () => {
  const checkpointPath = makeCheckpointPath();
  const checkpointStore = new LocalDisclosureCheckpointStore(checkpointPath);
  checkpointStore.write("00258801", "202605200030");

  const mockBody = {
    ok: true,
    traceId: "keyword-second",
    contractVersion: "v1",
    observedAt: "2026-05-20T13:10:00Z",
    data: {
      corpCode: "00258801",
      company: null,
      disclosures: [
        {
          rcept_no: "202605200031",
          report_nm: "신규 공시",
          rcept_dt: "20260520",
        },
        {
          rcept_no: "202605200030",
          report_nm: "사업보고서",
          rcept_dt: "20260520",
        },
      ],
    },
    evidence: [],
  };

  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(mockBody));
    },
    async () =>
      runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "system",
          keyword: "카카오",
          traceId: "keyword-second",
        }),
        { checkpointStore },
      ),
  );

  assert.equal(result.ok, true);
  assert.equal(result.checkpoint.previousLastSeen, "202605200030");
  assert.equal(result.hasNewDisclosure, true);
  assert.deepEqual(result.newDisclosureIds, ["202605200031"]);
  assert.equal(checkpointStore.read("00258801"), "202605200031");
});

test("scheduler runOnce always sends cron source", async () => {
  let observedSource = null;
  const scheduler = createDisclosureScheduler({
    run: async (request) => {
      observedSource = request.source;
      return {
        ok: true,
        triggerSource: request.source,
        traceId: request.traceId ?? "scheduler-trace",
        contractVersion: request.contractVersion ?? "v1",
        hasNewDisclosure: false,
        newDisclosureCount: 0,
        newDisclosureIds: [],
        checkpoint: {
          checkpointPath: "/tmp/checkpoints.json",
          previousLastSeen: null,
          currentLastSeen: null,
        },
        result: {
          ok: true,
          traceId: request.traceId ?? "scheduler-trace",
          contractVersion: request.contractVersion ?? "v1",
          observedAt: "2026-05-20T12:30:00Z",
          data: { corpCode: "00258801", company: null, disclosures: [] },
          evidence: [],
        },
      };
    },
  });

  const result = await scheduler.runOnce({
    keyword: "카카오",
    traceId: "scheduler-run",
  });
  assert.equal(observedSource, "cron");
  assert.equal(result.triggerSource, "cron");
});

test("CLI one-off trigger from agent/ returns typed trigger envelope", async () => {
  const checkpointPath = makeCheckpointPath();
  const checkpointStore = new LocalDisclosureCheckpointStore(checkpointPath);

  let capturedUrl = null;
  let capturedMethod = null;
  let capturedBody = null;

  const mockBody = {
    ok: true,
    traceId: "cli-trace",
    contractVersion: "v1",
    observedAt: "2026-05-20T12:40:00Z",
    data: {
      corpCode: "00258801",
      company: {
        corp_name: "카카오",
        stock_code: "035720",
        corp_code: "00258801",
        market: "KOSPI",
      },
      disclosures: [
        {
          rcept_no: "202605200010",
          report_nm: "사업보고서",
          rcept_dt: "20260520",
        },
      ],
    },
    evidence: [],
  };

  const result = await withMockServer(
    (req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        capturedUrl = req.url;
        capturedMethod = req.method;
        capturedBody = body ? JSON.parse(body) : null;
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(mockBody));
      });
    },
    async (port) => {
      const r = await runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "user",
          keyword: "카카오",
          traceId: "cli-trace",
        }),
        { checkpointStore },
      );
      return { result: r, port };
    },
  );

  // Verify the HTTP path was taken: correct URL, method, and body
  assert.ok(
    capturedUrl && capturedUrl.includes("disclosures"),
    `expected disclosures URL, got ${capturedUrl}`,
  );
  assert.equal(capturedMethod, "POST");
  assert.ok(
    capturedBody?.keyword === "카카오" || capturedBody?.corpCode,
    "body should contain keyword or corpCode",
  );

  // Verify typed trigger envelope
  assert.equal(result.result.ok, true);
  assert.equal(result.result.triggerSource, "user");
  assert.equal(result.result.traceId, "cli-trace");
  assert.equal(result.result.hasNewDisclosure, false);

  // Verify checkpoint write
  assert.equal(existsSync(checkpointPath), true);
  assert.equal(
    JSON.parse(readFileSync(checkpointPath, "utf-8")).disclosures["00258801"],
    "202605200010",
  );

  rmSync(checkpointPath.replace(/\/checkpoints\.json$/, ""), {
    recursive: true,
    force: true,
  });
});

test("first cron run initializes checkpoint without downstream pipeline surface", async () => {
  const checkpointPath = makeCheckpointPath();
  const checkpointStore = new LocalDisclosureCheckpointStore(checkpointPath);

  const mockBody = {
    ok: true,
    traceId: "first-cron",
    contractVersion: "v1",
    observedAt: "2026-05-20T12:00:00Z",
    data: {
      corpCode: "00258801",
      company: null,
      disclosures: [
        {
          rcept_no: "202605200002",
          report_nm: "사업보고서",
          rcept_dt: "20260520",
        },
        {
          rcept_no: "202605200001",
          report_nm: "분기보고서",
          rcept_dt: "20260520",
        },
      ],
    },
    evidence: [],
  };

  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(mockBody));
    },
    async () =>
      runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "cron",
          keyword: "카카오",
          traceId: "first-cron",
        }),
        { checkpointStore },
      ),
  );

  assert.equal(result.ok, true);
  assert.equal(result.hasNewDisclosure, false);
});

test("subsequent cron run with new disclosures still reports canonical ids", async () => {
  const checkpointPath = makeCheckpointPath();
  const checkpointStore = new LocalDisclosureCheckpointStore(checkpointPath);
  checkpointStore.write("00258801", "202605200002");

  const mockBody = {
    ok: true,
    traceId: "cron-new",
    contractVersion: "v1",
    observedAt: "2026-05-20T12:10:00Z",
    data: {
      corpCode: "00258801",
      company: null,
      disclosures: [
        {
          rcept_no: "202605200003",
          report_nm: "신규 공시",
          rcept_dt: "20260520",
        },
        {
          rcept_no: "202605200002",
          report_nm: "사업보고서",
          rcept_dt: "20260520",
        },
      ],
    },
    evidence: [],
  };

  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(mockBody));
    },
    async () =>
      runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "cron",
          keyword: "카카오",
          traceId: "cron-new",
        }),
        { checkpointStore },
      ),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.newDisclosureIds, ["202605200003"]);
});

test("manual user trigger no longer exposes agent-side pipeline execution", async () => {
  const checkpointPath = makeCheckpointPath();
  const checkpointStore = new LocalDisclosureCheckpointStore(checkpointPath);
  checkpointStore.write("00258801", "202605200010");

  const mockBody = {
    ok: true,
    traceId: "manual-no-new",
    contractVersion: "v1",
    observedAt: "2026-05-20T12:30:00Z",
    data: {
      corpCode: "00258801",
      company: null,
      disclosures: [
        {
          rcept_no: "202605200010",
          report_nm: "사업보고서",
          rcept_dt: "20260520",
        },
      ],
    },
    evidence: [],
  };

  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(mockBody));
    },
    async () =>
      runTriggeredDisclosureCheck(
        createDisclosureTriggerRequest({
          source: "user",
          keyword: "카카오",
          traceId: "manual-no-new",
        }),
        { checkpointStore },
      ),
  );

  assert.equal(result.ok, true);
  assert.equal(result.hasNewDisclosure, false);
  assert.equal("pipelineResult" in result, false);
});
