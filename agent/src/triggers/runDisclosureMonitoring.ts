import type { DisclosureTriggerRequest } from "../contracts/request.js";
import type { DisclosureExpertResult } from "../skills/disclosureExpertSkill.js";
import type { PipelineResult } from "../contracts/pipeline.js";
import { runTriggeredDisclosureCheck } from "./disclosureTrigger.js";
import { createDisclosureExpertSkill } from "../skills/disclosureExpertSkill.js";
import { pushReport } from "../clients/reportsClient.js";

export type MonitoringDeps = {
  triggerCheck?: typeof runTriggeredDisclosureCheck;
  pipelineInvoke?: (request: {
    source: string;
    corpCode?: string;
    keyword?: string;
    traceId?: string;
  }) => Promise<PipelineResult>;
  skillInvoke?: (input: {
    traceId: string;
    normalizedDataBundle: Record<string, unknown>;
    analysisResult: {
      risk_score: number;
      risk_level: "normal" | "caution" | "high";
      checklist: unknown[];
    };
  }) => Promise<DisclosureExpertResult>;
  reportPush?: typeof pushReport;
};

export const runDisclosureMonitoring = async (
  request: DisclosureTriggerRequest,
  deps: MonitoringDeps = {},
): Promise<void> => {
  const doTrigger = deps.triggerCheck ?? runTriggeredDisclosureCheck;
  const doPush = deps.reportPush ?? pushReport;

  let triggerResult;
  try {
    triggerResult = await doTrigger(request);
  } catch (err) {
    process.stderr.write(
      `[monitoring] trigger failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return;
  }

  if (!triggerResult.ok || !triggerResult.hasNewDisclosure) {
    return;
  }

  const corpCode = triggerResult.result.data.corpCode;
  const keyword = request.keyword;
  const traceId = triggerResult.traceId;

  // pipeline
  let pipelineResult: PipelineResult;
  try {
    if (deps.pipelineInvoke) {
      pipelineResult = await deps.pipelineInvoke({
        source: "cron",
        corpCode,
        keyword,
        traceId,
      });
    } else {
      const { runAnalysisPipelineTool } =
        await import("../tools/runAnalysisPipeline.js");
      pipelineResult = await runAnalysisPipelineTool.invoke({
        source: "cron",
        corpCode,
        keyword,
        traceId,
      });
    }
  } catch (err) {
    process.stderr.write(
      `[monitoring] pipeline failed for ${corpCode ?? keyword}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return;
  }

  if (!pipelineResult.ok) {
    process.stderr.write(
      `[monitoring] pipeline error for ${corpCode ?? keyword}: ${pipelineResult.error.message}\n`,
    );
    return;
  }

  const { normalized_data_bundle, analysis_result } = pipelineResult.result;

  // skill
  let skillResult: DisclosureExpertResult;
  try {
    if (deps.skillInvoke) {
      skillResult = await deps.skillInvoke({
        traceId,
        normalizedDataBundle: normalized_data_bundle,
        analysisResult: {
          risk_score: analysis_result.risk_score,
          risk_level: analysis_result.risk_level,
          checklist: analysis_result.checklist,
        },
      });
    } else {
      const skill = createDisclosureExpertSkill();
      skillResult = await skill.invoke({
        traceId,
        normalizedDataBundle: normalized_data_bundle,
        analysisResult: {
          risk_score: analysis_result.risk_score,
          risk_level: analysis_result.risk_level,
          checklist: analysis_result.checklist,
        },
      });
    }
  } catch (err) {
    process.stderr.write(
      `[monitoring] skill failed for ${corpCode ?? keyword}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return;
  }

  if (!skillResult.ok) {
    process.stderr.write(
      `[monitoring] skill error for ${corpCode ?? keyword}: ${skillResult.error.message}\n`,
    );
    return;
  }

  const prose = skillResult.solar.text;

  // push to backend
  try {
    await doPush({
      corpCode,
      keyword,
      traceId,
      analysisResult: analysis_result,
      prose,
    });
  } catch (err) {
    process.stderr.write(
      `[monitoring] report push failed for ${corpCode ?? keyword}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
};
