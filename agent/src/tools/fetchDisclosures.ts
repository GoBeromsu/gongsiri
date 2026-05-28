import type { TSchema } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import type { FetchDisclosuresRequest } from "../contracts/request.js";
import { FETCH_DISCLOSURES_TOOL_NAME } from "../contracts/tool.js";
import type { ToolResult, ToolResultFailure } from "../contracts/response.js";
import { resolveContractVersion } from "../session/session.js";

type FetchLike = typeof fetch;

export type FetchDisclosuresParams = {
  corpCode?: string;
  keyword?: string;
  traceId?: string;
  contractVersion?: "v2";
};

type CreateFetchDisclosuresToolOptions = {
  backendUrl?: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

const DEFAULT_CONTRACT_VERSION = "v2" as const;
const DEFAULT_TRACE_ID = "pi-bootstrap-trace";
const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
const DEFAULT_TIMEOUT_MS = 30_000;
const INTERNAL_PATH = "/internal/disclosures";

const buildFailure = (
  code: ToolResultFailure["error"]["code"],
  message: string,
  traceId: string,
  contractVersion: "v2",
): ToolResultFailure => ({
  ok: false,
  traceId,
  contractVersion,
  observedAt: new Date().toISOString(),
  error: {
    code,
    message,
  },
  evidence: [],
});

const resolveRequestContractVersion = (
  request: FetchDisclosuresRequest,
): "v2" =>
  request.contractVersion ??
  resolveContractVersion() ??
  DEFAULT_CONTRACT_VERSION;

const isToolResult = (value: unknown): value is ToolResult => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.ok !== "boolean" ||
    typeof candidate.traceId !== "string" ||
    typeof candidate.contractVersion !== "string" ||
    typeof candidate.observedAt !== "string" ||
    !Array.isArray(candidate.evidence)
  ) {
    return false;
  }

  if (candidate.ok) {
    return Boolean(candidate.data && typeof candidate.data === "object");
  }

  return Boolean(
    candidate.error &&
    typeof candidate.error === "object" &&
    typeof (candidate.error as Record<string, unknown>).code === "string" &&
    typeof (candidate.error as Record<string, unknown>).message === "string",
  );
};

const resolveBackendUrl = (
  options: CreateFetchDisclosuresToolOptions,
): string => {
  const raw =
    options.backendUrl ??
    options.env?.AGENT_BACKEND_URL ??
    process.env.AGENT_BACKEND_URL ??
    DEFAULT_BACKEND_URL;
  return raw.replace(/\/+$/, "");
};

const defaultOptions: CreateFetchDisclosuresToolOptions = {};

// 직접 호출자(trigger/cron)가 사용하는 plain async function
export const executeFetchDisclosures = async (
  request: FetchDisclosuresRequest,
  options: CreateFetchDisclosuresToolOptions = defaultOptions,
): Promise<ToolResult> => {
  const traceId = request.traceId ?? DEFAULT_TRACE_ID;
  const contractVersion = resolveRequestContractVersion(request);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `${resolveBackendUrl(options)}${INTERNAL_PATH}`;
  const payload = {
    ...request,
    traceId,
    contractVersion,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = (error as { name?: string } | null)?.name === "AbortError";
    return buildFailure(
      "bridge_process_failed",
      aborted
        ? `저 공시리가 backend ${INTERNAL_PATH} 호출이 ${timeoutMs}ms 안에 응답하지 않아 중단했습니다.`
        : error instanceof Error
          ? error.message
          : "저 공시리가 backend internal endpoint 호출에 실패했습니다.",
      traceId,
      contractVersion,
    );
  } finally {
    clearTimeout(timer);
  }

  let raw: string;
  try {
    raw = (await response.text()).trim();
  } catch (error) {
    return buildFailure(
      "bridge_malformed_output",
      error instanceof Error
        ? error.message
        : "저 공시리가 backend 응답 본문을 읽지 못했습니다.",
      traceId,
      contractVersion,
    );
  }

  if (!raw) {
    return buildFailure(
      "bridge_process_failed",
      `저 공시리가 받은 backend ${INTERNAL_PATH} 응답이 비어 있습니다. (status=${response.status})`,
      traceId,
      contractVersion,
    );
  }

  try {
    const parsed = JSON.parse(raw);

    if (isToolResult(parsed)) {
      return parsed;
    }

    return buildFailure(
      response.ok ? "bridge_malformed_output" : "bridge_process_failed",
      `저 공시리가 backend ${INTERNAL_PATH} 응답을 ToolResult contract로 해석하지 못했습니다. (status=${response.status})`,
      traceId,
      contractVersion,
    );
  } catch (error) {
    return buildFailure(
      "bridge_malformed_output",
      error instanceof Error
        ? error.message
        : "저 공시리가 backend 응답 JSON을 파싱하지 못했습니다.",
      traceId,
      contractVersion,
    );
  }
};

// TypeBox TSchema 없이 JSON Schema 객체를 직접 사용 (SDK가 내부적으로 typebox를 번들링)
const fetchDisclosuresParameters = {
  type: "object",
  properties: {
    corpCode: {
      type: "string",
      description: "종목 코드 또는 기업 코드 (8자리)",
    },
    keyword: {
      type: "string",
      description: "검색 키워드 (corpCode 미제공 시 사용)",
    },
    traceId: { type: "string", description: "추적 ID" },
    contractVersion: { type: "string", enum: ["v2"], description: "계약 버전" },
  },
} as unknown as TSchema;

// SDK tool — piSession customTools 등록에 사용
export const fetchDisclosuresTool = defineTool({
  name: FETCH_DISCLOSURES_TOOL_NAME,
  label: "Fetch Disclosures",
  description:
    "Read-only disclosure fetch backed by backend /internal/disclosures",
  parameters: fetchDisclosuresParameters,
  execute: async (_toolCallId: string, params: FetchDisclosuresParams) => {
    const result = await executeFetchDisclosures(
      params as FetchDisclosuresRequest,
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
      details: { ok: result.ok, traceId: result.traceId },
    };
  },
});
