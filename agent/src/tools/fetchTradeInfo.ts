import type { TSchema } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { FETCH_TRADE_INFO_TOOL_NAME } from "../contracts/tool.js";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
const TOOL_TIMEOUT_MS = 10_000;
const TRADE_INFO_PATH = "/api/v1/external/trade-info";

export type FetchTradeInfoParams = {
  stockCode: string;
  market?: string;
};

export type FetchTradeInfoResult =
  | { ok: true; price: number; change_rate: number; history: unknown[] }
  | { ok: false; error: { code: string; message: string } };

const resolveBackendUrl = (): string => {
  const raw =
    process.env.AGENT_BACKEND_URL ??
    process.env.GONGSIRI_BACKEND_URL ??
    DEFAULT_BACKEND_URL;
  return raw.replace(/\/+$/, "");
};

const buildFailure = (code: string, message: string): FetchTradeInfoResult => ({
  ok: false,
  error: { code, message },
});

export const executeFetchTradeInfo = async (
  params: FetchTradeInfoParams,
): Promise<FetchTradeInfoResult> => {
  const qs = new URLSearchParams({ stock_code: params.stockCode });
  if (params.market) qs.set("market", params.market);
  const url = `${resolveBackendUrl()}${TRADE_INFO_PATH}?${qs.toString()}`;
  const startMs = Date.now();

  const attempt = async (isRetry: boolean): Promise<FetchTradeInfoResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const latencyMs = Date.now() - startMs;

      if (!response.ok) {
        console.log(
          `[tool] tool=${FETCH_TRADE_INFO_TOOL_NAME} latencyMs=${latencyMs} status=failure`,
        );
        return buildFailure(
          "fetch_trade_info_failed",
          `HTTP ${response.status}`,
        );
      }

      const parsed = (await response.json()) as Record<string, unknown>;
      console.log(
        `[tool] tool=${FETCH_TRADE_INFO_TOOL_NAME} latencyMs=${latencyMs} status=${isRetry ? "retry_ok" : "ok"}`,
      );
      return {
        ok: true,
        price: parsed.price as number,
        change_rate: parsed.change_rate as number,
        history: (parsed.history as unknown[]) ?? [],
      };
    } catch (error) {
      const latencyMs = Date.now() - startMs;
      const aborted = (error as { name?: string })?.name === "AbortError";
      console.log(
        `[tool] tool=${FETCH_TRADE_INFO_TOOL_NAME} latencyMs=${latencyMs} status=${aborted ? "retry" : "failure"}`,
      );
      return buildFailure(
        "fetch_trade_info_failed",
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

const fetchTradeInfoParameters = {
  type: "object",
  required: ["stockCode"],
  properties: {
    stockCode: { type: "string", description: "주식 종목 코드 (예: 005930)" },
    market: { type: "string", description: "시장 구분 (KOSPI / KOSDAQ)" },
  },
} as unknown as TSchema;

export const fetchTradeInfoTool = defineTool({
  name: FETCH_TRADE_INFO_TOOL_NAME,
  label: "Fetch Trade Info",
  description: "주식 현재가 및 거래량 추이 조회 — 주가 급등 항목 판별 보조",
  parameters: fetchTradeInfoParameters,
  execute: async (_toolCallId: string, params: FetchTradeInfoParams) => {
    const result = await executeFetchTradeInfo(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
      details: { ok: result.ok },
    };
  },
});
