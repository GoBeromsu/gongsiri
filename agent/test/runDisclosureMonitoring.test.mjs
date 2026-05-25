import test from "node:test";
import assert from "node:assert/strict";

import { runDisclosureMonitoring } from "../dist/triggers/runDisclosureMonitoring.js";
import { createDisclosureTriggerRequest } from "../dist/triggers/disclosureTrigger.js";

// Minimal fake ToolResultSuccess shape for trigger
const makeToolResultSuccess = (corpCode = "00258801") => ({
  ok: true,
  traceId: "test-trace",
  contractVersion: "v1",
  observedAt: "2026-05-25T00:00:00Z",
  data: {
    corpCode,
    company: { corp_name: "카카오", stock_code: "035720" },
    disclosures: [
      {
        rcept_no: "20260525000001",
        report_nm: "주요사항보고서",
        rcept_dt: "20260525",
      },
    ],
  },
  evidence: [],
});

const makeTriggeredResult = ({
  hasNewDisclosure,
  newDisclosureIds = [],
} = {}) => ({
  ok: true,
  triggerSource: "cron",
  traceId: "test-trace",
  contractVersion: "v1",
  hasNewDisclosure,
  newDisclosureCount: newDisclosureIds.length,
  newDisclosureIds,
  checkpoint: {
    checkpointPath: "/tmp/checkpoints.json",
    previousLastSeen: "20260524",
    currentLastSeen: "20260525",
  },
  result: makeToolResultSuccess(),
});

const makePipelineSuccess = () => ({
  ok: true,
  triggerSource: "cron",
  traceId: "test-trace",
  contractVersion: "v1",
  observedAt: "2026-05-25T00:00:00Z",
  result: {
    normalized_data_bundle: {
      company: { corp_name: "카카오", corp_code: "00258801" },
      disclosures: [],
    },
    analysis_result: {
      risk_score: 2,
      risk_level: "caution",
      checklist: [],
      short_term_report: "",
      long_term_report: "",
      disclaimer: "",
      missing_evidence: [],
    },
    preparation: { persistence: {}, notification: {} },
  },
  evidence: [],
});

const makeExpertSuccess = () => ({
  ok: true,
  tool: "chat_with_solar",
  traceId: "test-trace",
  contractVersion: "v1",
  observedAt: "2026-05-25T00:00:00Z",
  solar: {
    ok: true,
    traceId: "test-trace",
    contractVersion: "v1",
    observedAt: "2026-05-25T00:00:00Z",
    model: "stub-solar",
    text: JSON.stringify({ summary: "ok", riskLevel: "caution" }),
  },
});

const makeRequest = () =>
  createDisclosureTriggerRequest({
    source: "cron",
    keyword: "카카오",
    corpCode: "00258801",
    traceId: "test-trace",
    intervalMinutes: 30,
  });

// Case 1: hasNewDisclosure=false → pipeline, skill, client called 0 times
test("runDisclosureMonitoring: no new disclosure → pipeline/skill/client not called", async () => {
  const pipelineCalls = [];
  const skillCalls = [];
  const pushCalls = [];

  await runDisclosureMonitoring(makeRequest(), {
    triggerCheck: async () => makeTriggeredResult({ hasNewDisclosure: false }),
    pipelineInvoke: async (r) => {
      pipelineCalls.push(r);
      return makePipelineSuccess();
    },
    skillInvoke: async (r) => {
      skillCalls.push(r);
      return makeExpertSuccess();
    },
    reportPush: async (r) => {
      pushCalls.push(r);
    },
  });

  assert.equal(
    pipelineCalls.length,
    0,
    "pipeline must not be called when no new disclosure",
  );
  assert.equal(
    skillCalls.length,
    0,
    "skill must not be called when no new disclosure",
  );
  assert.equal(
    pushCalls.length,
    0,
    "client must not be called when no new disclosure",
  );
});

// Case 2: hasNewDisclosure=true, 2 ids → pipeline 1×, skill 1×, client 1×
test("runDisclosureMonitoring: new disclosures → pipeline/skill/client each called once with correct args", async () => {
  const pipelineCalls = [];
  const skillCalls = [];
  const pushCalls = [];

  await runDisclosureMonitoring(makeRequest(), {
    triggerCheck: async () =>
      makeTriggeredResult({
        hasNewDisclosure: true,
        newDisclosureIds: ["20260525000001", "20260525000002"],
      }),
    pipelineInvoke: async (r) => {
      pipelineCalls.push(r);
      return makePipelineSuccess();
    },
    skillInvoke: async (r) => {
      skillCalls.push(r);
      return makeExpertSuccess();
    },
    reportPush: async (r) => {
      pushCalls.push(r);
    },
  });

  assert.equal(pipelineCalls.length, 1, "pipeline must be called exactly once");
  assert.equal(skillCalls.length, 1, "skill must be called exactly once");
  assert.equal(pushCalls.length, 1, "client must be called exactly once");

  assert.equal(pipelineCalls[0].source, "cron");
  assert.equal(pipelineCalls[0].corpCode, "00258801");
  assert.equal(skillCalls[0].traceId, "test-trace");
  assert.equal(skillCalls[0].analysisResult.risk_level, "caution");
  assert.equal(pushCalls[0].corpCode, "00258801");
  assert.equal(pushCalls[0].traceId, "test-trace");
  assert.equal(typeof pushCalls[0].prose, "string");
});

// Case 3: pipeline fails → skill/client not called
test("runDisclosureMonitoring: pipeline failure → skill/client not called", async () => {
  const skillCalls = [];
  const pushCalls = [];

  await runDisclosureMonitoring(makeRequest(), {
    triggerCheck: async () =>
      makeTriggeredResult({
        hasNewDisclosure: true,
        newDisclosureIds: ["20260525000001"],
      }),
    pipelineInvoke: async () => ({
      ok: false,
      triggerSource: "cron",
      traceId: "test-trace",
      contractVersion: "v1",
      observedAt: "2026-05-25T00:00:00Z",
      error: { code: "bridge_process_failed", message: "python crashed" },
      evidence: [],
    }),
    skillInvoke: async (r) => {
      skillCalls.push(r);
      return makeExpertSuccess();
    },
    reportPush: async (r) => {
      pushCalls.push(r);
    },
  });

  assert.equal(
    skillCalls.length,
    0,
    "skill must not be called when pipeline fails",
  );
  assert.equal(
    pushCalls.length,
    0,
    "client must not be called when pipeline fails",
  );
});

// Case 4: skill fails → client not called
test("runDisclosureMonitoring: skill failure → client not called", async () => {
  const pushCalls = [];

  await runDisclosureMonitoring(makeRequest(), {
    triggerCheck: async () =>
      makeTriggeredResult({
        hasNewDisclosure: true,
        newDisclosureIds: ["20260525000001"],
      }),
    pipelineInvoke: async () => makePipelineSuccess(),
    skillInvoke: async () => ({
      ok: false,
      tool: "chat_with_solar",
      traceId: "test-trace",
      contractVersion: "v1",
      observedAt: "2026-05-25T00:00:00Z",
      error: { code: "disclosure_expert_solar_failed", message: "solar error" },
    }),
    reportPush: async (r) => {
      pushCalls.push(r);
    },
  });

  assert.equal(
    pushCalls.length,
    0,
    "client must not be called when skill fails",
  );
});
