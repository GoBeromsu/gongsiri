import type { PromptRequest } from "../contracts/request.js";
import type { ToolDefinition } from "../contracts/tool.js";
import type { AgentResponse } from "../contracts/response.js";
import {
  DISCLOSURE_INTAKE_SKILL,
  selectDisclosureIntakeSkill
} from "../skills/disclosureIntakeSkill.js";

export class PiDisclosureAgent {
  readonly name = "PiDisclosureAgent";

  constructor(private readonly tool: ToolDefinition) {}

  canHandle(prompt: PromptRequest): boolean {
    const normalized = prompt.text.toLowerCase();
    return ["공시", "disclosure", "dart"].some((keyword) => normalized.includes(keyword));
  }

  async run(prompt: PromptRequest): Promise<AgentResponse> {
    const selection = selectDisclosureIntakeSkill();
    const result = await this.tool.invoke({
      keyword: prompt.text,
      traceId: prompt.traceId,
      contractVersion: prompt.contractVersion ?? "v1"
    });

    return {
      agent: this.name,
      skill: DISCLOSURE_INTAKE_SKILL,
      tool: selection.tool,
      traceId: result.traceId,
      contractVersion: result.contractVersion,
      result
    };
  }
}
