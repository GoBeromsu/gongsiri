from __future__ import annotations

from backend.analyzer.prompts import step2 as step2_prompts
from backend.analyzer.prompts.step2 import DISCLAIMER
from backend.analyzer.solar_client import SolarAPIError, chat_json
from backend.schemas.analysis import AnalysisResult
from backend.schemas.bundle import NormalizedDataBundle


def _failed_item_titles(analysis_result: AnalysisResult) -> list[str]:
    return [item.title for item in analysis_result.checklist if item.status == "fail"]


def _checklist_explanations(analysis_result: AnalysisResult) -> list[str]:
    return [
        f"{item.title}: {item.solar_explanation or item.reason}"
        for item in analysis_result.checklist
    ]


def run_step2(bundle: NormalizedDataBundle, analysis_result: AnalysisResult) -> AnalysisResult:
    analysis_result.disclaimer = DISCLAIMER
    failed_items = _failed_item_titles(analysis_result)
    explanations = _checklist_explanations(analysis_result)
    disclosure_texts = [d.report_nm for d in bundle.disclosures]

    if analysis_result.risk_level == "high":
        messages = step2_prompts.build_warning_messages(
            corp_name=bundle.company.corp_name,
            risk_score=analysis_result.risk_score,
            failed_items=failed_items,
            checklist_explanations=explanations,
        )
        try:
            result = chat_json(messages, retries=1)
            warning = result.get("warning_report", "")
        except SolarAPIError:
            warning = f"{bundle.company.corp_name}의 위험도가 높아 상세 분석을 제공할 수 없습니다."

        analysis_result.short_term_report = warning
        analysis_result.long_term_report = ""
        return analysis_result

    messages = step2_prompts.build_normal_caution_messages(
        corp_name=bundle.company.corp_name,
        risk_score=analysis_result.risk_score,
        risk_level=analysis_result.risk_level,
        failed_items=failed_items,
        checklist_explanations=explanations,
        disclosure_texts=disclosure_texts,
    )
    try:
        result = chat_json(messages, retries=1)
        analysis_result.short_term_report = result.get("short_term_report", "")
        analysis_result.long_term_report = result.get("long_term_report", "")
    except SolarAPIError:
        analysis_result.short_term_report = (
            f"{bundle.company.corp_name} 단기 분석 생성에 실패했습니다."
        )
        analysis_result.long_term_report = (
            f"{bundle.company.corp_name} 장기 분석 생성에 실패했습니다."
        )

    return analysis_result
