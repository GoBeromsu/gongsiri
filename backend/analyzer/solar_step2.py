from __future__ import annotations

from backend.analyzer.solar_client import SolarAPIError, chat_json
from backend.schemas.analysis import AnalysisResult
from backend.schemas.bundle import NormalizedDataBundle

DISCLAIMER = "본 리포트는 공시 기반 위험 점검이며 투자 권유가 아닙니다."


def _base_messages(
    bundle: NormalizedDataBundle, analysis_result: AnalysisResult
) -> list[dict[str, str]]:
    checklist = "\n".join(
        f"- [{item.status}] {item.title}: {item.solar_explanation or item.reason}"
        for item in analysis_result.checklist
    )
    return [
        {
            "role": "system",
            "content": (
                "당신은 공시 기반 위험 점검 리포트를 작성하는 한국어 분석가입니다. "
                "JSON으로만 응답하세요."
            ),
        },
        {
            "role": "user",
            "content": (
                f"종목명: {bundle.company.corp_name}\n"
                f"위험도: {analysis_result.risk_level} ({analysis_result.risk_score})\n\n"
                f"체크리스트:\n{checklist or '없음'}"
            ),
        },
    ]


def run_step2(bundle: NormalizedDataBundle, analysis_result: AnalysisResult) -> AnalysisResult:
    try:
        payload = chat_json(_base_messages(bundle, analysis_result), retries=1)
    except SolarAPIError as exc:
        if "UPSTAGE_API_KEY" in str(exc):
            return analysis_result
        analysis_result.short_term_report = f"저 공시리가 STEP2 리포트 생성에 실패했습니다: {exc}"
        analysis_result.long_term_report = ""
        analysis_result.disclaimer = DISCLAIMER
        return analysis_result

    if analysis_result.risk_level == "high" or analysis_result.risk_score >= 4:
        analysis_result.short_term_report = str(
            payload.get("warning_report")
            or "위험도가 높아 추가 분석보다 위험 리포트를 우선 제공합니다."
        )
        analysis_result.long_term_report = ""
    else:
        analysis_result.short_term_report = str(payload.get("short_term_report") or "")
        analysis_result.long_term_report = str(payload.get("long_term_report") or "")
    analysis_result.disclaimer = DISCLAIMER
    return analysis_result
