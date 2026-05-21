from __future__ import annotations

SYSTEM = """당신은 한국 주식시장 공시 분석 전문가입니다.
작전주 위험 판정 결과를 바탕으로 투자자를 위한 분석 리포트를 작성합니다.

규칙:
- 반드시 JSON 형식으로만 응답합니다.
- 모든 판단은 제공된 공시·시세·재무 데이터에 근거합니다.
- 투자 권유나 매수/매도 의견은 절대 포함하지 않습니다.
- 문체는 간결하고 사실 중심으로 작성합니다."""

DISCLAIMER = "본 리포트는 공시·시세·뉴스 데이터 기반 참고 자료이며 투자 판단을 대체하지 않습니다."


def build_normal_caution_messages(
    corp_name: str,
    risk_score: int,
    risk_level: str,
    failed_items: list[str],
    checklist_explanations: list[str],
    disclosure_texts: list[str],
) -> list[dict[str, str]]:
    failed_block = "\n".join(f"- {item}" for item in failed_items) or "없음"
    explanation_block = "\n".join(f"- {e}" for e in checklist_explanations[:6]) or "없음"
    disclosure_block = "\n".join(f"- {t}" for t in disclosure_texts[:8]) or "없음"

    user_content = f"""종목명: {corp_name}
위험도: {risk_level} (총점 {risk_score}/6)

=== 위험 항목 ===
{failed_block}

=== Solar 맥락 해석 ===
{explanation_block}

=== 주요 공시 ===
{disclosure_block}

위 분석 결과를 바탕으로 단기·장기 분석 리포트를 작성하세요.
다음 JSON 형식으로만 응답하세요:

{{
  "short_term_report": "단기(1~3개월) 관점 분석 리포트 (200자 내외)",
  "long_term_report": "장기(6개월 이상) 관점 분석 리포트 (200자 내외)"
}}"""

    return [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user_content},
    ]


def build_warning_messages(
    corp_name: str,
    risk_score: int,
    failed_items: list[str],
    checklist_explanations: list[str],
) -> list[dict[str, str]]:
    failed_block = "\n".join(f"- {item}" for item in failed_items) or "없음"
    explanation_block = "\n".join(f"- {e}" for e in checklist_explanations[:6]) or "없음"

    user_content = f"""종목명: {corp_name}
위험도: 위험 (총점 {risk_score}/6) — STEP2 분석 중단

=== 감지된 위험 항목 ({len(failed_items)}개) ===
{failed_block}

=== Solar 맥락 해석 ===
{explanation_block}

위험도가 높아 상세 분석을 중단하고 경고 리포트를 작성합니다.
다음 JSON 형식으로만 응답하세요:

{{
  "warning_report": "경고 리포트 본문 (감지된 위험 항목과 근거 중심, 300자 내외)"
}}"""

    return [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user_content},
    ]
