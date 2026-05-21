from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

SOLAR_BASE_URL = "https://api.upstage.ai/v1"
DEFAULT_MODEL = "solar-pro3"


class SolarAPIError(RuntimeError):
    code = "solar_api_error"


def _get_api_key() -> str:
    key = os.environ.get("UPSTAGE_API_KEY", "")
    if not key:
        raise SolarAPIError("UPSTAGE_API_KEY 환경변수가 설정되지 않았습니다.")
    return key


def _get_model() -> str:
    return os.environ.get("UPSTAGE_MODEL", DEFAULT_MODEL)


def _post(endpoint: str, body: dict[str, Any]) -> dict[str, Any]:
    api_key = _get_api_key()
    url = f"{SOLAR_BASE_URL}{endpoint}"
    data = json.dumps(body, ensure_ascii=False).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode(errors="replace")
        raise SolarAPIError(f"Solar API HTTP {exc.code}: {body_text}") from exc
    except Exception as exc:
        raise SolarAPIError(f"Solar API 요청 실패: {exc}") from exc


def _extract_content(response: dict[str, Any]) -> str:
    try:
        return response["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise SolarAPIError(f"Solar 응답 파싱 실패: {response}") from exc


def _parse_json_content(content: str) -> Any:
    content = content.strip()
    if content.startswith("```"):
        lines = content.splitlines()
        content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    return json.loads(content)


def chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    response_format: dict[str, str] | None = None,
) -> str:
    body: dict[str, Any] = {
        "model": _get_model(),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        body["response_format"] = response_format

    response = _post("/chat/completions", body)
    return _extract_content(response)


def chat_json(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    retries: int = 1,
) -> Any:
    # JSON 응답 요청, 파싱 실패 시 retries 횟수만큼 재요청
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            content = chat(
                messages,
                temperature=temperature + attempt * 0.1,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            return _parse_json_content(content)
        except (json.JSONDecodeError, SolarAPIError) as exc:
            last_exc = exc
    raise SolarAPIError(f"Solar JSON 파싱 {retries + 1}회 실패: {last_exc}") from last_exc
