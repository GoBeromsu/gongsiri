/**
 * agentPrompt.ts — buildPrompt()가 SKILL.md 본문 + runtime context를 포함하는지 검증
 * (AC-34, AC-36)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

// buildPrompt를 import
const { buildPrompt } = await import("../dist/agentPrompt.js");

const baseRequest = {
  traceId: "prompt-test-trace",
  contractVersion: "v2",
  corpCode: "00258801",
  corpName: "카카오",
};

// report mode — SKILL.md + context 포함 검증
test("report buildPrompt returns a non-empty string", () => {
  const prompt = buildPrompt({ ...baseRequest, mode: "report" });
  assert.equal(typeof prompt, "string");
  assert.ok(prompt.length > 0);
});

test("report buildPrompt includes corpCode in output", () => {
  const prompt = buildPrompt({ ...baseRequest, mode: "report" });
  assert.match(prompt, /00258801/);
});

test("report buildPrompt includes corpName in output", () => {
  const prompt = buildPrompt({ ...baseRequest, mode: "report" });
  assert.match(prompt, /카카오/);
});

test("report buildPrompt with extra prompt includes it", () => {
  const prompt = buildPrompt({
    ...baseRequest,
    mode: "report",
    prompt: "한 줄 요약 추가",
  });
  assert.match(prompt, /추가 작성 지시: 한 줄 요약 추가/);
});

test("report buildPrompt without extra prompt has no '추가 작성 지시' line", () => {
  const prompt = buildPrompt({ ...baseRequest, mode: "report" });
  assert.doesNotMatch(prompt, /추가 작성 지시/);
});

// qa mode
test("qa buildPrompt includes question in output", () => {
  const prompt = buildPrompt({
    ...baseRequest,
    mode: "qa",
    question: "CB 공시가 있나요?",
  });
  assert.match(prompt, /CB 공시/);
});

// checklist_explanation mode
test("checklist_explanation buildPrompt includes checklistIds in output", () => {
  const prompt = buildPrompt({
    ...baseRequest,
    mode: "checklist_explanation",
    checklistIds: ["hot-theme-following"],
  });
  assert.match(prompt, /hot-theme-following/);
});

// buildPrompt는 SKILL.md를 읽으므로 컴파일 결과에 readFileSync가 있어야 한다.
// E12a 이후 agentPrompt.ts는 fs를 import하므로 readFileSync 참조가 있음.
const agentPromptSrc = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../dist/agentPrompt.js",
  ),
  "utf8",
);

test("agentPrompt.js compiled output calls readFileSync (SKILL.md 읽기)", () => {
  assert.match(
    agentPromptSrc,
    /readFileSync/,
    "buildPrompt must read SKILL.md via fs.readFileSync",
  );
});

test("agentPrompt.js compiled output references loadSkillBody", () => {
  assert.match(agentPromptSrc, /loadSkillBody/);
});

test("agentPrompt.js compiled output references stripFrontmatter", () => {
  assert.match(agentPromptSrc, /stripFrontmatter/);
});
