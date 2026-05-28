# 06. Pi Agent Architecture — PR1

## Architecture Summary

PR1 uses a thin Pi → Python subprocess architecture. Pi owns orchestration; Python owns disclosure-domain execution.

## Component View

### Pi runtime layer

Planned home: `agent/`

Responsibilities:

- session lifecycle
- prompt intake
- skill selection
- tool invocation
- runtime request/response envelopes

### Python bridge layer

Current files:

- `backend/collector/bridge/disclosures.py`
- `backend/collector/cli/fetch_disclosures.py`
- `backend/collector/company_resolver.py`

Responsibilities:

- validate request shape
- resolve corp code in read-only mode when needed
- call authoritative DART collector
- map exceptions to typed bridge failures
- emit JSON envelope on stdout

### Domain execution layer

Current files:

- `backend/collector/dart.py`
- `backend/collector/krx/search.py`
- other `backend/collector/*` modules

Responsibilities:

- collect disclosure/news/market/doc data
- maintain domain-specific logic
- remain the source of truth for disclosure fetch behavior

## Sequence

1. Pi receives prompt.
2. Agent chooses `disclosure-intake-skill`.
3. Skill invokes `fetch_disclosures`.
4. Tool spawns `python -m backend.collector.cli.fetch_disclosures`.
5. Bridge resolves corp code if required.
6. Bridge calls `backend.collector.dart.fetch_disclosures`.
7. Bridge returns typed success/failure envelope.
8. Pi packages the result into an `AgentResponse`.

## Constraints

- ~~no HTTP delegation in PR1~~ — **superseded by the HTTP + Pi SDK Architecture Decision below (2026-05-21)**
- no tracked asset mutation during runtime fetch
- ~~`backend/main.py` remains passive and separate from Pi hosting~~ — **superseded**: backend now actively orchestrates the agent from its service layer
- observability requires `traceId`, `contractVersion`, `observedAt`, and evidence propagation

## G002 Trigger Architecture Addendum

### New runtime components

- `agent/src/triggers/` — typed trigger normalization and checkpoint-aware execution
- `agent/src/state/` — ignored local checkpoint store for last-seen disclosure IDs
- `agent/src/scheduler/` — cron-oriented orchestration surface that delegates to the same trigger runtime
- `agent/src/cli/` — one-off/manual trigger entrypoint

### G002 rules

- checkpoint identity is canonicalized to resolved `corpCode`
- failed runs do not advance checkpoint state
- cron/manual/system triggers all reuse the same Python bridge path
- G002 remains runtime-only and does not add frontend, DB, or notification components

## G003 Pipeline Architecture Addendum

### New Python components

- `backend/collector/runtime_normalize.py` — Pi-safe read-only/additive normalization adapter
- `backend/analyzer/` — deterministic checklist/report orchestration
- `backend/analyzer/cli/run_pipeline.py` — canonical Python pipeline entrypoint

### New runtime components

- `agent/src/contracts/pipeline.ts` — historical pipeline contract types retained only for compatibility review

### G003 rules

- pipeline normalization must not persist new symbols to `assets/stock_master.json`
- pipeline normalization must not delete local report files
- analyzer core should stay deterministic first, with any narrative/LLM boundary clearly isolated
- persistence/notification stay as DTO/port preparation only

## Solar Chat Verification Addendum

### Runtime surface

- `agent/src/tools/chatWithSolar.ts`
- `agent/src/cli/runSolarChat.ts`

### Role

- provide one live Upstage Solar-backed Pi runtime communication path for operator/runtime verification
- keep API-key use in env only
- return a typed machine-readable chat envelope

## HTTP + Pi SDK Architecture Decision (2026-05-21)

This decision supersedes the PR1 "no HTTP delegation" / "passive backend" constraints
above. It defines the target architecture for connecting the **report** and **QA**
paths to the agent. Status: **implemented for demo, still requires team review before merge**
(CLAUDE.md rule 6 — this changes the A↔B↔C seam).

### Decision summary

1. **Layered backend, single frontend surface.** The frontend talks only to the
   backend (FastAPI). The frontend never knows the agent exists.
2. **Agent runtime = separate long-running Node HTTP service** that uses the real
   Pi SDK (`@earendil-works/pi-coding-agent`). The existing `agent/` package is
   now the demo runtime (`npm run serve`) instead of a Pi-named skeleton.
3. **The backend service layer calls the agent over internal HTTP.** The agent sits
   _below_ the controller, invoked by the service/application layer — not in front of
   the backend.
4. **The agent is a leaf.** It must never call backend HTTP endpoints and never touch
   the production DB. It returns drafts/explanations only. This removes the
   `backend → agent → POST /pipeline/trigger → backend` cycle.
5. **Option A division of labour.** The backend collects DART data and runs the
   deterministic 6-item scoring (`backend/collector/` + `backend/analyzer/`), then
   hands a normalized bundle to the agent. The agent performs Solar reasoning and
   produces the report narrative / QA answer. No re-port of the Python analyzer.

### Target call flow

```
Frontend ──HTTP──> Backend (FastAPI)
                     controller : backend/api/
                       └ application/service layer
                           1. collector + analyzer  → normalized bundle + 6-item score
                           2. ──internal HTTP──> Agent runtime (Node, Pi SDK)
                                                    └ Solar reasoning → report / QA draft
                           3. persist + respond to frontend
```

Rules: `frontend → backend` allowed; `backend → agent` allowed;
`agent → backend` forbidden **단, cron 발원 `POST /api/v1/reports` 한 경로만 예외** (agent 자체 스케줄러가 분석 결과를 backend에 push하는 단방향 write-only 호출);
`agent → production DB` forbidden.

### Pi SDK integration

- Package: `@earendil-works/pi-coding-agent` (npm, MIT, Node ≥ 22.19).
- **Solar support**: Pi SDK reaches Upstage Solar through a custom OpenAI-compatible
  provider registered by `agent/src/pi/piSession.ts` — default
  `baseUrl: "https://api.upstage.ai/v1"`, `api: "openai-completions"`, model id
  `solar-pro3`, and runtime API key from `UPSTAGE_API_KEY`.
- Pi SDK is a _coding_ agent. **checklist-explanation** path runs with `noTools: "all"`
  and backend-provided JSON context only (strict single-call). **QA and report paths** run as
  tool-using agent loops with `customTools` (2026-05-28 — see §ADR-2026-05-28):
  - report: `[run_risk_analysis, fetch_disclosure_evidence, fetch_trade_info, search_news]`
  - qa: `[fetch_disclosures, run_risk_analysis, fetch_disclosure_evidence, fetch_trade_info, search_news]`
    Both use max 5 turns, 10 s per-tool timeout, 60 s total budget.
    The SDK is adopted as the agent substrate so that genuine multi-step autonomy
    (Option B / §8 self-driving loop) is the natural next milestone.
- Backend↔agent communication is **internal HTTP** (long-running agent service),
  not subprocess RPC — chosen so Pi session state survives and the autonomous
  scheduler can later be hosted in the same process.

### What changes from the PR1 subprocess architecture

- any former agent-owned pipeline trigger/tool surface is removed/inverted: the backend
  service now calls the agent, and the agent no longer calls the backend.
- A new agent HTTP server entrypoint is added under `agent/` (Node `http`-based).
- A QA bridge path is added (addresses `docs/10` deferred item #2).
- The `agent/` skeleton is re-homed onto the Pi SDK instead of hand-rolled contracts.

### Scope

- **In scope now**: report generation path + QA path, both routed frontend → backend
  service layer → agent.
- **Deferred**: the autonomous `disclosureScheduler` loop (§8) — hosted in the same
  long-running agent service in a later milestone.

### Demo implementation notes

- Start order: `agent` service → FastAPI backend → Next frontend.
- `POST /api/v1/reports` runs collector/analyzer first, then requires the Pi SDK
  service to rewrite the report narrative. Failure returns a typed error; it does not
  silently use the deterministic/Solar-only report as a substitute.
- `POST /qa` builds the same normalized bundle + analysis context, then requires the
  Pi SDK service to answer. Failure returns a typed error; it does not call legacy
  `backend/analyzer/qa.py` as fallback.
- All user-facing report/QA/error copy should speak as first-person `공시리`.

## QA Multi-Turn Architecture (2026-05-26)

QA 경로와 Report·checklist_explanation 경로는 명시적으로 분리된다.

- **QA (`mode: "qa"` + `conversationKey` 있음)**: process-scope warm `Map<convKey, AgentSession>` 재사용. `convKey = "${user_id}::${corp_code}"`. idle TTL 30분, LRU 100. cold restart 시 `qa_history`의 최근 N≤20턴을 `session.agent.state.messages`에 Path A 직접 주입(`pi-agent-core@0.75.4 agent.d.ts:70` 공식 copy-on-assign 시맨틱). 구현: `agent/src/pi/qaSession.ts`.
- **Report / checklist_explanation / QA without conversationKey**: single-call (`createAgentSession → prompt → dispose`). warm map에 영향 없음. 구현: `runPiSession` (`agent/src/pi/piSession.ts`).

Deferred(§8): 멀티 인스턴스 sticky routing / 분산 conversation cache.

## G010 Narrative Migration Note

As of G010, backend analyzer ownership is narrowed to deterministic scoring, evidence mapping, and preparation DTOs. Report narrative, Q&A prose, and checklist explanation prose belong to the 공시리 agent modes (`report`, `qa`, `checklist_explanation`) over normalized backend facts. Legacy `backend/analyzer/solar_step*.py` prompt modules are retained only as historical/compatibility artifacts until later cleanup removes them entirely.

## System Prompt (2026-05-28)

### claude-code convention 채택

공시리 system prompt는 [tallesborges/agentic-system-prompts](https://github.com/tallesborges/agentic-system-prompts) claude-code 포맷을 채택한다.
YAML frontmatter(source/retrieved/model/provider/variables) + 마크다운 섹션 구조 유지.

**파일 경로:** `agent/.pi/prompts/gongsiri-system.md`

### Pi SDK 주입 지점

Pi SDK `systemPromptOverride` 옵션 (sdk.md:458, :920)으로 주입:

```ts
systemPromptOverride: () => loadGongsiriSystemPrompt({
  mode,
  corpCode,
  traceId,
  contractVersion,
  todayDate: new Date().toISOString().slice(0, 10),
  workingDirectory: process.cwd(),
}),
```

`loadGongsiriSystemPrompt()`는 `agent/src/pi/systemPrompt.ts`에 구현 — frontmatter strip + `${VAR}` 치환 수행.

### 변수 목록

| 변수                   | 의미                                        |
| ---------------------- | ------------------------------------------- |
| `${MODE}`              | `report` \| `qa` \| `checklist_explanation` |
| `${CORP_CODE}`         | 종목 코드 (예: `035720`), 없으면 `(N/A)`    |
| `${TRACE_ID}`          | 요청 추적 ID                                |
| `${CONTRACT_VERSION}`  | 계약 버전 (예: `v2`)                        |
| `${TODAY_DATE}`        | 오늘 날짜 KST (예: `2026-05-28`)            |
| `${WORKING_DIRECTORY}` | `process.cwd()`                             |

## ADR-2026-05-28 — Report-Path Tool-Loop Activation

**상태:** 결정됨 (plan iter 3, `feature/C-pi-agent-tool-loop`)

### 문제

`noTools: "all"` 정책은 QA·checklist-explanation에 적합하나 report 경로에서는 agent가
tool을 전혀 실행하지 못해 "진짜 에이전트 자율 동작"이 불가능함.
사용자 바인딩 결정: "agent가 첫 turn에 `run_risk_analysis`를 직접 호출"하는 것이
핵심 변화로 정의됨 (spec Round 3).

### 결정

- `POST /report` 경로에서 `noTools: "all"` 제거, `customTools` 4개 활성화.
- `POST /qa` 경로에서 `noTools: "all"` 제거, `customTools` 5개 활성화 (데이터 조회 필요 시만 자율 호출).
- `POST /checklist-explanation`만 `noTools: "all"` 유지.
- 환경변수 `GONGSIRI_AGENT_REPORT_MODE=true`로 활성화 (기본값 false = 기존 pipeline 경로).

### Report 경로 tool 목록

| Wire name                   | TS instance                   | HTTP endpoint                        |
| --------------------------- | ----------------------------- | ------------------------------------ |
| `run_risk_analysis`         | `runRiskAnalysisTool`         | `POST /pipeline/trigger`             |
| `fetch_disclosure_evidence` | `fetchDisclosureEvidenceTool` | `GET /api/v1/external/dart/evidence` |
| `fetch_trade_info`          | `fetchTradeInfoTool`          | `GET /api/v1/external/trade-info`    |
| `search_news`               | `searchNewsTool`              | `GET /api/v1/external/news`          |

`fetch_disclosures`는 report 경로 registry에 포함하지 않는다 (qa/checklist 전용 호환 유지).

### 가드레일

- MAX_TURNS = 5, per-tool timeout = 10 s, 전체 예산 = 60 s (`Promise.race`)
- Solar narration은 non-final turn에만; final turn은 반드시 `{`로 시작
- tool 실패 시 retry 1회 후 `warnings[]` 추가, agent는 계속 진행 (500 금지)
- cache hit 시 agent tool-loop 우회 (GONGSIRI_AGENT_REPORT_MODE 분기는 cache miss 이후)

### 결과

- HTTP 계약 `{view:"report-detail", corpCode}` 미변경.
- `resolve_report_view()` 미수정.
- frontend 변경 없음.

## G010 Cleanup Record

`backend/analyzer/solar_step1.py` 의 `chat_json` LLM 호출 및 `_enrich_with_explanations`
가 제거됨 (브랜치 `feature/C-step1-explanation-takeover`, 2026-05-25). 동시에
`backend/analyzer/solar_client.py`, `backend/analyzer/prompts/step1.py` 삭제.

결정적 채점 (`build_checklist` / `calculate_risk_score` / `classify_risk_level`) 은 유지된다.
체크리스트 항목 설명(prose)의 단일 생성 경로:

1. backend `run_step1` → `solar_explanation = ""` 초기화 (schema default)
2. `attach_agent_report` → `explain_checklist_with_agent`
3. agent `gongsiri-checklist-explanation` skill 실행
4. `merge_checklist_explanations` → `solar_explanation` 채움

backend 는 LLM 으로 prose 를 직접 생성하지 않는다 (G010).
