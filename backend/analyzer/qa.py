from __future__ import annotations

from backend.analyzer.prompts.qa_prompt import build_messages
from backend.analyzer.solar_client import SolarAPIError, chat
from backend.analyzer.solar_step1 import run_step1
from backend.analyzer.solar_step2 import run_step2
from backend.schemas.analysis import AnalysisResult
from backend.schemas.bundle import NormalizedDataBundle


def analyze_bundle(bundle: NormalizedDataBundle) -> AnalysisResult:
    step1_result = run_step1(bundle)
    return run_step2(bundle, step1_result)


def ask_qa(question: str, bundle: NormalizedDataBundle, analysis_result: AnalysisResult) -> str:
    checklist_summary = [
        {
            "title": item.title,
            "status": item.status,
            "reason": item.reason,
            "solar_explanation": item.solar_explanation,
        }
        for item in analysis_result.checklist
    ]
    disclosure_texts = [
        " ".join(filter(None, [d.report_nm, d.parsed_text])) for d in bundle.disclosures
    ]
    messages = build_messages(
        question=question,
        corp_name=bundle.company.corp_name,
        disclosure_texts=disclosure_texts,
        checklist_summary=checklist_summary,
        risk_level=analysis_result.risk_level,
    )
    try:
        return chat(messages)
    except SolarAPIError as exc:
        return f"저 공시리가 Q&A 답변 생성에 실패했습니다: {exc}"
