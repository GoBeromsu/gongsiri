/**
 * integration/agentToolLoop.test.mjs
 * mock HTTP 서버로 /pipeline/trigger stub → runPiSession trace log 패턴 검증
 * (AC-07, AC-27, AC-29 integration)
 *
 * 실제 Pi SDK 세션을 호출하지 않고, tool 실행 레이어(executeRunRiskAnalysis)만
 * mock HTTP 서버를 통해 검증한다.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { executeRunRiskAnalysis } from "../../dist/tools/runRiskAnalysis.js";
import { executeFetchDisclosureEvidence } from "../../dist/tools/fetchDisclosureEvidence.js";
import { executeFetchTradeInfo } from "../../dist/tools/fetchTradeInfo.js";
import { executeSearchNews } from "../../dist/tools/searchNews.js";
import { stripNonJsonPrefix } from "../../dist/utils/parseHelpers.js";
import {
  RUN_RISK_ANALYSIS_TOOL_NAME,
  FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME,
  FETCH_TRADE_INFO_TOOL_NAME,
  SEARCH_NEWS_TOOL_NAME,
} from "../../dist/contracts/tool.js";

// ── mock HTTP 서버 헬퍼 ────────────────────────────────────────────────────

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

// ── /pipeline/trigger stub → executeRunRiskAnalysis 검증 ────────────────────

test("executeRunRiskAnalysis calls /pipeline/trigger on mock server and returns ok:true", async () => {
  const calls = [];
  const result = await withMockServer(
    (req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        calls.push({ url: req.url, method: req.method, body });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            risk_score: 2,
            risk_level: "caution",
            checklist: [],
            traceId: "integration-trace",
          }),
        );
      });
    },
    async () =>
      executeRunRiskAnalysis({
        corpCode: "00258801",
        traceId: "integration-trace",
      }),
  );
  assert.equal(result.ok, true, "mock server should return ok:true");
  assert.equal(result.risk_score, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");
});

test("executeRunRiskAnalysis: HTTP 200 + ok:false from mock server → upstream_pipeline_failed", async () => {
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
      executeRunRiskAnalysis({
        corpCode: "00258801",
        traceId: "double-check-trace",
      }),
  );
  assert.equal(result.ok, false);
  assert.match(result.error?.code ?? "", /upstream_pipeline_failed/);
});

// ── stdout trace log 패턴 검증 (AC-27) ─────────────────────────────────────

test("executeRunRiskAnalysis emits stdout trace log with expected pattern", async () => {
  const logLines = [];
  const origWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...args) => {
    logLines.push(typeof chunk === "string" ? chunk : chunk.toString());
    return origWrite(chunk, ...args);
  };

  try {
    await withMockServer(
      (req, res) => {
        req.resume();
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            risk_score: 1,
            risk_level: "normal",
            checklist: [],
            traceId: "log-trace",
          }),
        );
      },
      async () =>
        executeRunRiskAnalysis({ corpCode: "00258801", traceId: "log-trace" }),
    );
  } finally {
    process.stdout.write = origWrite;
  }

  const combined = logLines.join("");
  // AC-27: [tool] turn=N tool=run_risk_analysis latencyMs=N status=...
  assert.match(
    combined,
    /\[tool\].*tool=run_risk_analysis.*latencyMs=\d+.*status=/,
    "stdout must contain trace log with expected pattern",
  );
});

// ── stripNonJsonPrefix integration ─────────────────────────────────────────

test("stripNonJsonPrefix correctly strips narration before JSON in real-world scenario", () => {
  const rawFinalText = [
    "저 공시리가 분석을 완료했습니다.",
    "",
    '{"shortTermMarkdown":"카카오 단기 리포트","longTermMarkdown":"카카오 장기 리포트","disclaimerMarkdown":"투자 참고용"}',
  ].join("\n");

  const stripped = stripNonJsonPrefix(rawFinalText);
  assert.ok(stripped.startsWith("{"));
  const parsed = JSON.parse(stripped);
  assert.equal(parsed.shortTermMarkdown, "카카오 단기 리포트");
  assert.equal(parsed.longTermMarkdown, "카카오 장기 리포트");
  assert.equal(parsed.disclaimerMarkdown, "투자 참고용");
});

// ── 모든 4개 tool wire name 상수 통합 검증 ─────────────────────────────────

test("all 4 report-mode tool wire names are distinct snake_case strings", () => {
  const names = [
    RUN_RISK_ANALYSIS_TOOL_NAME,
    FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME,
    FETCH_TRADE_INFO_TOOL_NAME,
    SEARCH_NEWS_TOOL_NAME,
  ];
  for (const name of names) {
    assert.match(name, /^[a-z][a-z_]+[a-z]$/, `${name} must be snake_case`);
  }
  assert.equal(new Set(names).size, 4);
});
