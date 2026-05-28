import { PiDisclosureAgent } from "./agents/PiDisclosureAgent.js";
import type { PromptRequest } from "./contracts/request.js";
import { normalizeManualPrompt } from "./prompt/manualPrompt.js";
import { createDisclosureScheduler } from "./scheduler/disclosureScheduler.js";
import { createSessionContext } from "./session/session.js";
import {
  createDisclosureTriggerRequest,
  runTriggeredDisclosureCheck,
} from "./triggers/disclosureTrigger.js";

export type RuntimeSkeleton = {
  entry: "agent/src/index.ts";
  session: ReturnType<typeof createSessionContext>;
  agent: PiDisclosureAgent;
};

export const createRuntimeSkeleton = (
  prompt: PromptRequest = normalizeManualPrompt("삼성전자 공시 조회"),
): RuntimeSkeleton => {
  const traceId = prompt.traceId ?? "pi-bootstrap-trace";
  const contractVersion = prompt.contractVersion ?? "v2";
  const session = createSessionContext(traceId, contractVersion);

  return {
    entry: "agent/src/index.ts",
    session,
    agent: new PiDisclosureAgent(),
  };
};

export const runManualPrompt = async (
  text: string,
  options: {
    traceId?: string;
    contractVersion?: "v2";
  } = {},
) => {
  const prompt = normalizeManualPrompt(text);
  const runtime = createRuntimeSkeleton({
    ...prompt,
    traceId: options.traceId ?? `manual-${Date.now()}`,
    contractVersion: options.contractVersion ?? "v2",
  });

  if (!runtime.agent.canHandle(prompt)) {
    throw new Error("저 공시리가 처리할 수 없는 프롬프트입니다.");
  }

  return runtime.agent.run({
    ...prompt,
    traceId: runtime.session.traceId,
    contractVersion: runtime.session.contractVersion,
  });
};

export {
  createDisclosureScheduler,
  createDisclosureTriggerRequest,
  runTriggeredDisclosureCheck,
};
export type {
  AgentHealthResponse,
  AgentQaRequest,
  AgentReportRequest,
  AgentServiceResponse,
} from "./contracts/agentService.js";
export { createAgentHttpServer, startAgentHttpServer } from "./server.js";
