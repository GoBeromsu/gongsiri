"""
test_report_runtime_builders.py — build_report_detail_response() 3 케이스 (AC-17)

1. GONGSIRI_AGENT_REPORT_MODE=true + cache miss  → AgentServiceClient().generate_report() 호출됨
2. GONGSIRI_AGENT_REPORT_MODE=true + cache hit   → AgentServiceClient().generate_report() 호출 안 됨
3. env 미설정                                     → 기존 pipeline path (regression)
"""

from __future__ import annotations

import os
from typing import Any
from unittest.mock import MagicMock, patch

os.environ["GONGSIRI_AUTH_MODE"] = "dev"


def _agent_response(corp_code: str = "00258801") -> dict[str, Any]:
    return {
        "ok": True,
        "mode": "report",
        "traceId": "test-agent-trace",
        "contractVersion": "v2",
        "observedAt": "2026-05-28T00:00:00Z",
        "markdown": "# 단기 리포트",
        "text": "# 단기 리포트",
        "warnings": [],
        "data": {
            "report": {
                "shortTermMarkdown": "단기 분석",
                "longTermMarkdown": "장기 분석",
                "disclaimerMarkdown": "투자 참고용",
            },
            "analysisGuard": {
                "riskScore": 2,
                "riskLevel": "caution",
                "checklistIds": [],
            },
        },
        "evidence": [{"source": "pi_sdk_agent_service"}],
    }


def _saved_row(corp_code: str = "00258801") -> dict[str, Any]:
    return {
        "id": f"report-{corp_code}-test-agent-trace",
        "user_id": "dev-admin",
        "corp_code": corp_code,
        "corp_name": "카카오",
        "risk_level": "caution",
        "risk_score": 2,
        "checklist": [],
        "short_term_report": "단기 분석",
        "long_term_report": "장기 분석",
        "disclaimer": "투자 참고용",
        "missing_evidence": [],
        "request_context": {"corpCode": corp_code, "source": "agent_tool_loop"},
        "source_timestamps": {},
        "strict_pi_sdk": 1,
        "generated_at": "2026-05-28T00:00:00Z",
        "source_version": "v1",
    }


def _detail_view(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "view": "report-detail",
        "corpCode": row["corp_code"],
        "corpName": row["corp_name"],
        "riskLevel": row["risk_level"],
        "riskScore": row["risk_score"],
        "shortTermReport": row["short_term_report"],
        "longTermReport": row["long_term_report"],
        "disclaimer": row["disclaimer"],
        "fallback": {"used": False, "reason": "agent_tool_loop"},
    }


# ─── Case 1: flag=true + cache miss → agent client 호출됨 ────────────────────


def test_agent_mode_cache_miss_calls_generate_report(monkeypatch):
    monkeypatch.setenv("GONGSIRI_AGENT_REPORT_MODE", "true")

    saved = _saved_row()
    agent_resp = _agent_response()

    mock_client_instance = MagicMock()
    mock_client_instance.generate_report.return_value = agent_resp
    mock_client_cls = MagicMock(return_value=mock_client_instance)

    mock_provider = MagicMock()
    mock_provider.reports.get_latest_detail.return_value = None  # cache miss

    with (
        patch("backend.report_runtime_builders.AgentServiceClient", mock_client_cls),
        patch(
            "backend.report_runtime_builders.get_repository_provider",
            return_value=mock_provider,
        ),
        patch(
            "backend.report_runtime_builders.save_agent_path_report",
            return_value=saved,
        ) as mock_save,
        patch(
            "backend.report_runtime_builders.detail_view_from_report_row",
            side_effect=lambda row, **kw: _detail_view(row),
        ),
        patch(
            "backend.report_runtime_builders.resolve_dev_user_id",
            return_value="dev-admin",
        ),
    ):
        from backend.report_runtime_builders import build_report_detail_response

        result = build_report_detail_response({"corpCode": "00258801", "view": "report-detail"})

    # AgentServiceClient().generate_report() 호출됨
    mock_client_instance.generate_report.assert_called_once()
    call_payload = mock_client_instance.generate_report.call_args[0][0]
    assert call_payload["corpCode"] == "00258801"

    # save_agent_path_report 호출됨
    mock_save.assert_called_once()

    # 반환값은 detail_view_from_report_row 결과
    assert result["view"] == "report-detail"
    assert result["corpCode"] == "00258801"


# ─── Case 2: flag=true + cache hit → agent client 호출 안 됨 ─────────────────


def test_agent_mode_cache_hit_skips_generate_report(monkeypatch):
    monkeypatch.setenv("GONGSIRI_AGENT_REPORT_MODE", "true")

    cached = _saved_row()
    agent_resp = _agent_response()

    mock_client_instance = MagicMock()
    mock_client_instance.generate_report.return_value = agent_resp
    mock_client_cls = MagicMock(return_value=mock_client_instance)

    mock_provider = MagicMock()
    mock_provider.reports.get_latest_detail.return_value = cached  # cache hit

    with (
        patch("backend.report_runtime_builders.AgentServiceClient", mock_client_cls),
        patch(
            "backend.report_runtime_builders.get_repository_provider",
            return_value=mock_provider,
        ),
        patch(
            "backend.report_runtime_builders.detail_view_from_report_row",
            side_effect=lambda row, **kw: _detail_view(row),
        ),
        patch(
            "backend.report_runtime_builders.resolve_dev_user_id",
            return_value="dev-admin",
        ),
    ):
        from backend.report_runtime_builders import build_report_detail_response

        result = build_report_detail_response({"corpCode": "00258801", "view": "report-detail"})

    # cache hit → generate_report 미호출 (AC-17 case b)
    mock_client_instance.generate_report.assert_not_called()

    # cache hit 결과가 반환됨
    assert result["corpCode"] == "00258801"


# ─── Case 3: env 미설정 → 기존 pipeline path (regression) ───────────────────


def test_no_agent_mode_uses_pipeline_path(monkeypatch):
    monkeypatch.delenv("GONGSIRI_AGENT_REPORT_MODE", raising=False)

    mock_pipeline_resp = {
        "ok": True,
        "triggerSource": "user",
        "traceId": "pipeline-trace",
        "contractVersion": "v2",
        "observedAt": "2026-05-28T00:00:00Z",
        "result": {
            "normalized_data_bundle": {
                "company": {"corp_name": "카카오", "corp_code": "00258801"},
            },
            "analysis_result": {
                "risk_score": 1,
                "risk_level": "normal",
                "checklist": [],
                "short_term_report": "pipeline 단기",
                "long_term_report": "pipeline 장기",
                "disclaimer": "투자 참고용",
                "missing_evidence": [],
            },
            "preparation": {},
        },
        "evidence": [{"source": "stub_pipeline"}],
    }

    saved = {
        "id": "report-00258801-pipeline-trace",
        "corp_code": "00258801",
        "corp_name": "카카오",
        "risk_level": "normal",
        "risk_score": 1,
        "short_term_report": "pipeline 단기",
        "long_term_report": "pipeline 장기",
        "disclaimer": "투자 참고용",
    }

    mock_agent_resp = {
        "ok": True,
        "result": mock_pipeline_resp["result"],
        "traceId": "pipeline-trace",
        "observedAt": "2026-05-28T00:00:00Z",
    }

    mock_client_instance = MagicMock()
    mock_client_cls = MagicMock(return_value=mock_client_instance)

    mock_provider = MagicMock()
    mock_provider.reports.get_latest_detail.return_value = None  # cache miss

    with (
        patch("backend.report_runtime_builders.AgentServiceClient", mock_client_cls),
        patch(
            "backend.report_runtime_builders.get_repository_provider",
            return_value=mock_provider,
        ),
        patch(
            "backend.report_runtime_builders.run_pipeline_request",
            return_value=mock_pipeline_resp,
        ),
        patch(
            "backend.report_runtime_builders.attach_agent_report",
            return_value=mock_agent_resp,
        ),
        patch(
            "backend.report_runtime_builders.save_generated_report",
            return_value=saved,
        ),
        patch(
            "backend.report_runtime_builders.detail_view_from_report_row",
            side_effect=lambda row, **kw: {
                "view": "report-detail",
                "corpCode": row.get("corp_code"),
            },
        ),
        patch(
            "backend.report_runtime_builders.resolve_dev_user_id",
            return_value="dev-admin",
        ),
    ):
        from backend.report_runtime_builders import build_report_detail_response

        result = build_report_detail_response({"corpCode": "00258801", "view": "report-detail"})

    # env 미설정 → agent client 호출 없음 (regression)
    mock_client_instance.generate_report.assert_not_called()

    assert result["view"] == "report-detail"
    assert result["corpCode"] == "00258801"
