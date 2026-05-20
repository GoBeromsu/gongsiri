import { PiDisclosureAgent } from "./agents/PiDisclosureAgent.js";
import { normalizeManualPrompt } from "./prompt/manualPrompt.js";
import { createSessionContext } from "./session/session.js";
import { fetchDisclosuresTool } from "./tools/fetchDisclosures.js";

export type RuntimeSkeleton = {
  entry: "agent/src/index.ts";
  session: ReturnType<typeof createSessionContext>;
  agent: PiDisclosureAgent;
};

export const createRuntimeSkeleton = (): RuntimeSkeleton => {
  const prompt = normalizeManualPrompt("공시 조회");
  const session = createSessionContext(prompt.traceId ?? "pi-bootstrap-trace");

  return {
    entry: "agent/src/index.ts",
    session,
    agent: new PiDisclosureAgent(fetchDisclosuresTool)
  };
};
