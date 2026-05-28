import type { TSchema } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME } from "../contracts/tool.js";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
const TOOL_TIMEOUT_MS = 10_000;
const EVIDENCE_PATH = "/api/v1/external/dart/evidence";

export type FetchDisclosureEvidenceParams = {
  corpCode: string;
};

export type FetchDisclosureEvidenceResult =
  | { ok: true; items: unknown[] }
  | { ok: false; error: { code: string; message: string } };

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
): FetchDisclosureEvidenceResult => ({
  ok: false,
  error: { code, message },
});

export const executeFetchDisclosureEvidence = async (
  params: FetchDisclosureEvidenceParams,
): Promise<FetchDisclosureEvidenceResult> => {
  const url = `${resolveBackendUrl()}${EVIDENCE_PATH}?corp_code=${encodeURIComponent(params.corpCode)}`;
  const startMs = Date.now();

  const attempt = async (
    isRetry: boolean,
  ): Promise<FetchDisclosureEvidenceResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const latencyMs = Date.now() - startMs;

      if (!response.ok) {
        console.log(
          `[tool] tool=${FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME} latencyMs=${latencyMs} status=failure`,
        );
        return buildFailure("fetch_evidence_failed", `HTTP ${response.status}`);
      }

      const parsed = (await response.json()) as Record<string, unknown>;
      console.log(
        `[tool] tool=${FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME} latencyMs=${latencyMs} status=${isRetry ? "retry_ok" : "ok"}`,
      );
      return {
        ok: true,
        items: (parsed.items as unknown[]) ?? [],
      };
    } catch (error) {
      const latencyMs = Date.now() - startMs;
      const aborted = (error as { name?: string })?.name === "AbortError";
      console.log(
        `[tool] tool=${FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME} latencyMs=${latencyMs} status=${aborted ? "retry" : "failure"}`,
      );
      return buildFailure(
        "fetch_evidence_failed",
        aborted ? `timeout after ${TOOL_TIMEOUT_MS}ms` : String(error),
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

const fetchDisclosureEvidenceParameters = {
  type: "object",
  required: ["corpCode"],
  properties: {
    corpCode: { type: "string", description: "기업 코드 (8자리)" },
  },
} as unknown as TSchema;

export const fetchDisclosureEvidenceTool = defineTool({
  name: FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME,
  label: "Fetch Disclosure Evidence",
  description: "DART 공시 증거 데이터 조회 — 위험 항목별 공시 원문 근거",
  parameters: fetchDisclosureEvidenceParameters,
  execute: async (
    _toolCallId: string,
    params: FetchDisclosureEvidenceParams,
  ) => {
    const result = await executeFetchDisclosureEvidence(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
      details: { ok: result.ok },
    };
  },
});
