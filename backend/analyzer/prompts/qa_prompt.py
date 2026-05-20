from __future__ import annotations

SYSTEM = """당신은 한국 주식시장 공시 분석 전문가입니다.
사용자의 질문에 대해 제공된 공시·분석 데이터를 근거로 답변합니다.

규칙:
- 답변은 반드시 제공된 데이터에서만 근거를 가져옵니다.
- 데이터에 없는 내용은 "해당 데이터가 없습니다"라고 명시합니다.
- 투자 권유나 매수/매도 의견은 절대 포함하지 않습니다.
- 한국어로 간결하게 답변합니다."""


def build_messages(
    question: str,
    corp_name: str,
    disclosure_texts: list[str],
    checklist_summary: list[dict],
    risk_level: str,
) -> list[dict[str, str]]:
    disclosure_block = "\n".join(f"- {t}" for t in disclosure_texts[:10]) or "없음"

    checklist_block = "\n".join(
        f"[{item['status']}] {item['title']}: {item.get('solar_explanation') or item['reason']}"
        for item in checklist_summary
    )

    user_content = f"""종목명: {corp_name}
현재 위험도: {risk_level}

=== 공시 데이터 ===
{disclosure_block}

=== 위험 항목 판정 결과 ===
{checklist_block}

=== 사용자 질문 ===
{question}

위 데이터를 근거로 질문에 답변하세요."""

    return [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user_content},
    ]
