import { createDisclosureScheduler } from "../scheduler/disclosureScheduler.js";
import { createDisclosureTriggerRequest, runTriggeredDisclosureCheck } from "../triggers/disclosureTrigger.js";

type ParsedArgs = {
  source: "user" | "system" | "cron";
  keyword?: string;
  corpCode?: string;
  traceId?: string;
  intervalMinutes?: number;
  runReason?: string;
  once: boolean;
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const parsed: ParsedArgs = {
    source: "user",
    once: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--source":
        parsed.source = (next as ParsedArgs["source"]) ?? "user";
        index += 1;
        break;
      case "--keyword":
        parsed.keyword = next;
        index += 1;
        break;
      case "--corp-code":
        parsed.corpCode = next;
        index += 1;
        break;
      case "--trace-id":
        parsed.traceId = next;
        index += 1;
        break;
      case "--interval-minutes":
        parsed.intervalMinutes = Number(next);
        index += 1;
        break;
      case "--run-reason":
        parsed.runReason = next;
        index += 1;
        break;
      case "--watch":
        parsed.once = false;
        break;
      default:
        break;
    }
  }

  return parsed;
};

export const main = async (argv = process.argv.slice(2)): Promise<number> => {
  const parsed = parseArgs(argv);

  try {
    if (parsed.source === "cron" && !parsed.once) {
      const started = createDisclosureScheduler().start({
        keyword: parsed.keyword,
        corpCode: parsed.corpCode,
        traceId: parsed.traceId,
        intervalMinutes: parsed.intervalMinutes,
        runReason: parsed.runReason
      });

      console.log(JSON.stringify({ ok: true, triggerSource: "cron", intervalMs: started.intervalMs }));
      return 0;
    }

    const result = await runTriggeredDisclosureCheck(
      createDisclosureTriggerRequest({
        source: parsed.source,
        keyword: parsed.keyword,
        corpCode: parsed.corpCode,
        traceId: parsed.traceId,
        intervalMinutes: parsed.intervalMinutes,
        runReason: parsed.runReason
      })
    );

    console.log(JSON.stringify(result));
    return result.ok ? 0 : 1;
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "trigger CLI 실행 중 알 수 없는 오류가 발생했습니다."
    );
    return 1;
  }
};

if (process.argv[1]?.endsWith("runDisclosureTrigger.js")) {
  main().then((code) => {
    process.exitCode = code;
  });
}
