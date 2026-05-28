/**
 * runRiskAnalysis.ts — executeRunRiskAnalysis + runRiskAnalysisTool (AC-03, AC-04, AC-28)
 * 특히 E1 double ok-check: HTTP 200 + {ok:false} → failure 반환
 *
 * 실제 구현은 global fetch + env var AGENT_BACKEND_URL 사용 — mock HTTP 서버로 테스트.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { RUN_RISK_ANALYSIS_TOOL_NAME } from "../../dist/contracts/tool.js";

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
  risk_score: 3,
  risk_level: "caution",
  checklist: [{ id: "hot-theme-following", score: 2 }],
  traceId: "rra-trace",
};

test("executeRunRiskAnalysis returns success on HTTP 200 + ok:true", async () => {
  const { executeRunRiskAnalysis } =
    await import("../../dist/tools/runRiskAnalysis.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(SUCCESS_BODY));
    },
    async () =>
      executeRunRiskAnalysis({ corpCode: "00258801", traceId: "rra-trace" }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.risk_score, 3);
});

// E1 double ok-check 핵심 케이스 (AC-04)
test("executeRunRiskAnalysis HTTP 200 + ok:false → upstream_pipeline_failed failure", async () => {
  const { executeRunRiskAnalysis } =
    await import("../../dist/tools/runRiskAnalysis.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ok: false,
          error: { message: "pipeline returned error" },
        }),
      );
    },
    async () =>
      executeRunRiskAnalysis({ corpCode: "00258801", traceId: "rra-fail" }),
  );
  assert.equal(result.ok, false);
  assert.match(result.error.code, /upstream_pipeline_failed/);
});

test("executeRunRiskAnalysis HTTP 500 → upstream_pipeline_failed failure", async () => {
  const { executeRunRiskAnalysis } =
    await import("../../dist/tools/runRiskAnalysis.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false }));
    },
    async () =>
      executeRunRiskAnalysis({ corpCode: "00258801", traceId: "rra-500" }),
  );
  assert.equal(result.ok, false);
  assert.match(result.error.code, /upstream_pipeline_failed/);
});

test("executeRunRiskAnalysis connection refused → failure", async () => {
  const { executeRunRiskAnalysis } =
    await import("../../dist/tools/runRiskAnalysis.js");
  const origEnv = process.env.AGENT_BACKEND_URL;
  process.env.AGENT_BACKEND_URL = "http://127.0.0.1:1";
  try {
    const result = await executeRunRiskAnalysis({
      corpCode: "00258801",
      traceId: "rra-throw",
    });
    assert.equal(result.ok, false);
  } finally {
    if (origEnv === undefined) delete process.env.AGENT_BACKEND_URL;
    else process.env.AGENT_BACKEND_URL = origEnv;
  }
});

test("runRiskAnalysisTool has correct wire name", async () => {
  const { runRiskAnalysisTool } =
    await import("../../dist/tools/runRiskAnalysis.js");
  assert.equal(runRiskAnalysisTool.name, RUN_RISK_ANALYSIS_TOOL_NAME);
});

test("runRiskAnalysisTool.execute returns content array with ok:true on success", async () => {
  const { runRiskAnalysisTool } =
    await import("../../dist/tools/runRiskAnalysis.js");
  const result = await withMockServer(
    (req, res) => {
      req.resume();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(SUCCESS_BODY));
    },
    async () =>
      runRiskAnalysisTool.execute("tool-call-id", {
        corpCode: "00258801",
        traceId: "sdk-rra",
      }),
  );
  assert.ok(Array.isArray(result.content));
  assert.ok(result.content.length >= 1);
  const parsed = JSON.parse(result.content[0].text);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.risk_score, 3);
});
