import type { TSchema } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { RUN_RISK_ANALYSIS_TOOL_NAME } from "../contracts/tool.js";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
const TOOL_TIMEOUT_MS = 10_000;
const PIPELINE_PATH = "/pipeline/trigger";

export type RunRiskAnalysisParams = {
  corpCode: string;
  contractVersion?: string;
  traceId?: string;
};

export type RunRiskAnalysisResult =
  | {
      ok: true;
      risk_score: number;
      risk_level: string;
      checklist: unknown[];
      traceId?: string;
    }
  | {
      ok: false;
      error: { code: string; message: string };
      traceId?: string;
    };

const resolveBackendUrl = (): string => {
  const raw =
    process.env.AGENT_BACKEND_URL ??
    process.env.GONGSIRI_BACKEND_URL ??
    DEFAULT_BACKEND_URL;
  return raw.replace(/\/+$/, "");
};

const buildFailure = (
  code: string,
  message: string,
  traceId?: string,
): RunRiskAnalysisResult => ({
  ok: false,
  error: { code, message },
  traceId,
});

export const executeRunRiskAnalysis = async (
  params: RunRiskAnalysisParams,
): Promise<RunRiskAnalysisResult> => {
  const traceId = params.traceId ?? `risk-${Date.now()}`;
  const url = `${resolveBackendUrl()}${PIPELINE_PATH}`;
  const startMs = Date.now();

  const attempt = async (isRetry: boolean): Promise<RunRiskAnalysisResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          corpCode: params.corpCode,
          contractVersion: params.contractVersion ?? "v2",
          traceId,
        }),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startMs;

      if (!response.ok) {
        const status = `upstream_pipeline_failed`;
        console.log(
          `[tool] tool=${RUN_RISK_ANALYSIS_TOOL_NAME} latencyMs=${latencyMs} status=failure traceId=${traceId}`,
        );
        return buildFailure(status, `HTTP ${response.status}`, traceId);
      }

      const parsed = (await response.json()) as Record<string, unknown>;

      if (!parsed?.ok) {
        const msg =
          ((parsed?.error as Record<string, unknown> | undefined)?.message as
            | string
            | undefined) ?? "pipeline returned ok=false";
        console.log(
          `[tool] tool=${RUN_RISK_ANALYSIS_TOOL_NAME} latencyMs=${latencyMs} status=failure traceId=${traceId}`,
        );
        return buildFailure("upstream_pipeline_failed", msg, traceId);
      }

      console.log(
        `[tool] tool=${RUN_RISK_ANALYSIS_TOOL_NAME} latencyMs=${latencyMs} status=${isRetry ? "retry_ok" : "ok"} traceId=${traceId}`,
      );
      return {
        ok: true,
        risk_score: parsed.risk_score as number,
        risk_level: parsed.risk_level as string,
        checklist: (parsed.checklist as unknown[]) ?? [],
        traceId,
      };
    } catch (error) {
      const latencyMs = Date.now() - startMs;
      const aborted = (error as { name?: string })?.name === "AbortError";
      const status = aborted ? "retry" : "failure";
      console.log(
        `[tool] tool=${RUN_RISK_ANALYSIS_TOOL_NAME} latencyMs=${latencyMs} status=${status} traceId=${traceId}`,
      );
      return buildFailure(
        "upstream_pipeline_failed",
        aborted ? `timeout after ${TOOL_TIMEOUT_MS}ms` : String(error),
        traceId,
      );
    } finally {
      clearTimeout(timer);
    }
  };

  const first = await attempt(false);
  if (!first.ok && first.error.message.includes("timeout")) {
    return attempt(true);
  }
  return first;
};

const runRiskAnalysisParameters = {
  type: "object",
  required: ["corpCode"],
  properties: {
    corpCode: { type: "string", description: "종목 코드 (예: 035720)" },
    contractVersion: { type: "string", description: "계약 버전 (기본값: v2)" },
    traceId: { type: "string", description: "추적 ID" },
  },
} as unknown as TSchema;

export const runRiskAnalysisTool = defineTool({
  name: RUN_RISK_ANALYSIS_TOOL_NAME,
  label: "Run Risk Analysis",
  description:
    "backend 전체 분석 파이프라인 실행 — 6항목 정량 채점 (risk_score / risk_level / checklist[])",
  parameters: runRiskAnalysisParameters,
  execute: async (_toolCallId: string, params: RunRiskAnalysisParams) => {
    const result = await executeRunRiskAnalysis(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
      details: { ok: result.ok },
    };
  },
});
