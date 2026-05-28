import { readFileSync } from "node:fs";
import { resolvePromptPath } from "../agentPaths.js";

export type SystemPromptContext = {
  mode: "report" | "qa" | "checklist_explanation";
  corpCode?: string;
  traceId: string;
  contractVersion: string;
  todayDate: string;
  workingDirectory: string;
};

export function loadGongsiriSystemPrompt(ctx: SystemPromptContext): string {
  const body = readFileSync(resolvePromptPath("gongsiri-system.md"), "utf8");
  const stripped = body.replace(/^---\n[\s\S]*?\n---\n+/, "");
  return stripped
    .replaceAll("${MODE}", ctx.mode)
    .replaceAll("${CORP_CODE}", ctx.corpCode ?? "(N/A)")
    .replaceAll("${TRACE_ID}", ctx.traceId)
    .replaceAll("${CONTRACT_VERSION}", ctx.contractVersion)
    .replaceAll("${TODAY_DATE}", ctx.todayDate)
    .replaceAll("${WORKING_DIRECTORY}", ctx.workingDirectory);
}
