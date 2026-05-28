---
title: "Tool vs Skill — 에이전트 멘탈 모델"
tags:
  [
    "agent",
    "tool",
    "skill",
    "api",
    "mental-model",
    "pi-agent",
    "gongsiri",
    "openclaw",
  ]
created: 2026-05-21T06:10:38.020Z
updated: 2026-05-28T00:00:00.000Z
sources:
  [
    "2026-05-21 대화: gongsiri agent 설계 논의",
    "openclaw repo src/tools, src/gateway, skills/*/SKILL.md",
    "2026-05-28 agent-tool-loop-report-path PR — defineTool 5개 확정",
  ]
links: ["gongsiri.md"]
category: pattern
confidence: high
schemaVersion: 1
---

# Tool vs Skill — 에이전트 멘탈 모델

# Tool vs Skill — 에이전트 멘탈 모델

gongsiri Pi 에이전트 설계 중 정립한 핵심 개념. openclaw(373k★) 레퍼런스로 교차검증됨.

## Tool = 단일 능력 (손)

- Pi SDK `defineTool()` 하나 = 한 가지 행동. 결정적. typed request in → typed result out.
- gongsiri tool 5개 (`agent/src/tools/`, 모두 `defineTool()` 기반):
  - `fetch_disclosures` — DART 공시 목록 조회 (qa 전용)
  - `run_risk_analysis` — 6항목 작전주 정량 채점 (report 첫 턴 필수, qa)
  - `fetch_disclosure_evidence` — 공시 본문·재무 evidence 조회 (report, qa)
  - `fetch_trade_info` — KRX 주가·거래량 조회 (report, qa)
  - `search_news` — 네이버 뉴스 검색 (report, qa)

## Skill = 절차·노하우 (머리)

- "이런 종류의 일은 → 어떤 툴을 → 어떤 요청으로 → 어떤 순서로 쓴다"는 패키지된 노하우.
- 툴을 직접 실행하지 않음. 툴을 _언제·어떻게_ 쓸지 알 뿐.
- Pi SDK `SKILL.md` = 코드가 아니라 **YAML frontmatter(`name`/`description`/`tools`) + 지침 마크다운**.
- gongsiri skill 3개 (`gongsiri-` prefix 필수, Pi SDK `skillsOverride`로 로드):
  - `gongsiri-report` — tool-loop 활성, 4개 tool 자율 호출, 최대 5턴 60s
  - `gongsiri-qa` — tool-loop 활성, 5개 tool 자율 호출 (필요 시만), 최대 5턴 60s
  - `gongsiri-checklist-explanation` — `noTools: "all"` strict, single-call

## 계층

```
Agent (프롬프트/트리거 받고 처리 가능 판단)
  └─ Skill (어떤 툴을, 어떤 요청으로, 어떤 순서로)
       └─ Tool (실제 실행)
```

비유: **Tool = 망치·드라이버 / Skill = 조립 설명서 / Agent = 작업자**.

## Tool vs API — `tool ⊃ API`

- 기계적으로 tool 호출 = API 호출 (동일).
- 차이는 **명세 대상**: API = 개발자용 계약 / Tool = 모델용 계약.
- Tool = API + 자연어 description + JSON schema + availability → **LLM이 "이걸 쓸까" 스스로 판단**할 수 있게 한 겹 더.
- openclaw `ToolDescriptor.executor.kind`는 `core | plugin | channel | mcp` — 외부 API를 tool로 노출하는 정석은 MCP.

## "어떤 엔드포인트를 tool로 감쌀까" — 판단 기준

> **"에이전트가 이걸로 *판단/추론*을 하는가, 사람이 _보기만_ 하는가?"**

- 주가·공시 → 에이전트가 작전주 6항목 판정에 씀 → tool ✅
- 워치리스트 CRUD·리포트 열람 → 사람이 화면에서 보기만 함 → tool ❌
- 모든 엔드포인트가 아니라 **추론에 필요한 부분집합만** tool로 래핑.

관련: [[gongsiri 에이전트 아키텍처]]
