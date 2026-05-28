import type { TSchema } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { SEARCH_NEWS_TOOL_NAME } from "../contracts/tool.js";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
const TOOL_TIMEOUT_MS = 10_000;
const NEWS_PATH = "/api/v1/external/news";

export type SearchNewsParams = {
  query: string;
};

export type SearchNewsResult =
  | { ok: true; items: unknown[] }
  | { ok: false; error: { code: string; message: string } };

const resolveBackendUrl = (): string => {
  const raw =
    process.env.AGENT_BACKEND_URL ??
    process.env.GONGSIRI_BACKEND_URL ??
    DEFAULT_BACKEND_URL;
  return raw.replace(/\/+$/, "");
};

const buildFailure = (code: string, message: string): SearchNewsResult => ({
  ok: false,
  error: { code, message },
});

export const executeSearchNews = async (
  params: SearchNewsParams,
): Promise<SearchNewsResult> => {
  const url = `${resolveBackendUrl()}${NEWS_PATH}?query=${encodeURIComponent(params.query)}`;
  const startMs = Date.now();

  const attempt = async (isRetry: boolean): Promise<SearchNewsResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const latencyMs = Date.now() - startMs;

      if (!response.ok) {
        console.log(
          `[tool] tool=${SEARCH_NEWS_TOOL_NAME} latencyMs=${latencyMs} status=failure`,
        );
        return buildFailure("search_news_failed", `HTTP ${response.status}`);
      }

      const parsed = (await response.json()) as Record<string, unknown>;
      console.log(
        `[tool] tool=${SEARCH_NEWS_TOOL_NAME} latencyMs=${latencyMs} status=${isRetry ? "retry_ok" : "ok"}`,
      );
      return {
        ok: true,
        items: (parsed.items as unknown[]) ?? [],
      };
    } catch (error) {
      const latencyMs = Date.now() - startMs;
      const aborted = (error as { name?: string })?.name === "AbortError";
      console.log(
        `[tool] tool=${SEARCH_NEWS_TOOL_NAME} latencyMs=${latencyMs} status=${aborted ? "retry" : "failure"}`,
      );
      return buildFailure(
        "search_news_failed",
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

const searchNewsParameters = {
  type: "object",
  required: ["query"],
  properties: {
    query: { type: "string", description: "검색어 (기업명 또는 관련 키워드)" },
  },
} as unknown as TSchema;

export const searchNewsTool = defineTool({
  name: SEARCH_NEWS_TOOL_NAME,
  label: "Search News",
  description: "뉴스 검색 — 기업 관련 최신 뉴스 및 이슈 조회",
  parameters: searchNewsParameters,
  execute: async (_toolCallId: string, params: SearchNewsParams) => {
    const result = await executeSearchNews(params);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
      details: { ok: result.ok },
    };
  },
});
