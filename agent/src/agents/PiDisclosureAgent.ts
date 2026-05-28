import type { PromptRequest } from "../contracts/request.js";
import type { AgentResponse } from "../contracts/response.js";
import { buildDisclosureRequest } from "../triggers/disclosureRouter.js";
import { executeFetchDisclosures } from "../tools/fetchDisclosures.js";
import { FETCH_DISCLOSURES_TOOL_NAME } from "../contracts/tool.js";

const DISCLOSURE_SKILL_NAME = "gongsiri-disclosure-intake";

export class PiDisclosureAgent {
  readonly name = "PiDisclosureAgent";

  canHandle(prompt: PromptRequest): boolean {
    const normalized = prompt.text.toLowerCase();
    return ["공시", "disclosure", "dart"].some((keyword) =>
      normalized.includes(keyword),
    );
  }

  async run(prompt: PromptRequest): Promise<AgentResponse> {
    const traceId = prompt.traceId ?? "pi-bootstrap-trace";
    const contractVersion = prompt.contractVersion ?? "v2";

    const result = await executeFetchDisclosures(
      buildDisclosureRequest({ ...prompt, traceId, contractVersion }),
    ).catch((error: unknown) => ({
      ok: false as const,
      traceId,
      contractVersion,
      observedAt: new Date().toISOString(),
      error: {
        code: "invalid_request" as const,
        message:
          error instanceof Error
            ? error.message
            : "알 수 없는 요청 오류가 발생했습니다.",
      },
      evidence: [] as [],
    }));

    return {
      agent: this.name,
      skill: DISCLOSURE_SKILL_NAME,
      tool: FETCH_DISCLOSURES_TOOL_NAME,
      traceId,
      contractVersion,
      result,
    };
  }
}
