/**
 * utils/parseHelpers.ts — stripNonJsonPrefix 3 케이스 (AC-E3, E3)
 */
import test from "node:test";
import assert from "node:assert/strict";

import { stripNonJsonPrefix } from "../../dist/utils/parseHelpers.js";

test("stripNonJsonPrefix strips narration prefix before JSON object", () => {
  const input =
    '공시리: 분석 중\n{"shortTermMarkdown":"x","longTermMarkdown":"y","disclaimerMarkdown":"z"}';
  const result = stripNonJsonPrefix(input);
  assert.ok(result.startsWith("{"));
  const parsed = JSON.parse(result);
  assert.equal(parsed.shortTermMarkdown, "x");
  assert.equal(parsed.longTermMarkdown, "y");
  assert.equal(parsed.disclaimerMarkdown, "z");
});

test("stripNonJsonPrefix strips prefix before JSON array", () => {
  const input = "분석을 완료했습니다.\n[1,2,3]";
  const result = stripNonJsonPrefix(input);
  assert.ok(result.startsWith("["));
  const parsed = JSON.parse(result);
  assert.deepEqual(parsed, [1, 2, 3]);
});

test("stripNonJsonPrefix returns original string when no JSON chars found", () => {
  const input = "순수한 텍스트 응답 — JSON 없음";
  const result = stripNonJsonPrefix(input);
  assert.equal(result, input);
});

test("stripNonJsonPrefix is identity when input already starts with {", () => {
  const input = '{"ok":true}';
  assert.equal(stripNonJsonPrefix(input), input);
});

test("stripNonJsonPrefix is identity when input already starts with [", () => {
  const input = "[1,2,3]";
  assert.equal(stripNonJsonPrefix(input), input);
});
