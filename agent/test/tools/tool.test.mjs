/**
 * contracts/tool.ts — 5개 wire name 상수 export 검증 (AC-01)
 */
import test from "node:test";
import assert from "node:assert/strict";

import * as toolContracts from "../../dist/contracts/tool.js";

test("FETCH_DISCLOSURES_TOOL_NAME is 'fetch_disclosures'", () => {
  assert.equal(toolContracts.FETCH_DISCLOSURES_TOOL_NAME, "fetch_disclosures");
});

test("RUN_RISK_ANALYSIS_TOOL_NAME is 'run_risk_analysis'", () => {
  assert.equal(toolContracts.RUN_RISK_ANALYSIS_TOOL_NAME, "run_risk_analysis");
});

test("FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME is 'fetch_disclosure_evidence'", () => {
  assert.equal(
    toolContracts.FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME,
    "fetch_disclosure_evidence",
  );
});

test("FETCH_TRADE_INFO_TOOL_NAME is 'fetch_trade_info'", () => {
  assert.equal(toolContracts.FETCH_TRADE_INFO_TOOL_NAME, "fetch_trade_info");
});

test("SEARCH_NEWS_TOOL_NAME is 'search_news'", () => {
  assert.equal(toolContracts.SEARCH_NEWS_TOOL_NAME, "search_news");
});

test("all 5 TOOL_NAME constants are unique strings", () => {
  const names = [
    toolContracts.FETCH_DISCLOSURES_TOOL_NAME,
    toolContracts.RUN_RISK_ANALYSIS_TOOL_NAME,
    toolContracts.FETCH_DISCLOSURE_EVIDENCE_TOOL_NAME,
    toolContracts.FETCH_TRADE_INFO_TOOL_NAME,
    toolContracts.SEARCH_NEWS_TOOL_NAME,
  ];
  for (const name of names) {
    assert.equal(typeof name, "string");
  }
  assert.equal(new Set(names).size, 5);
});
