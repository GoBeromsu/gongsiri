import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.storage.json_store import read_json, write_json

router = APIRouter(prefix="/api/disclosure")

WATCHLIST_PATH = Path("data/watchlist.json")


class DisclosureCheckRequest(BaseModel):
    corp_code: str


@router.post("/check")
async def check_disclosure(body: DisclosureCheckRequest):
    agent_url = os.environ.get("GONGSIRI_AGENT_URL", "http://127.0.0.1:8787")
    trace_id = str(uuid.uuid4())

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{agent_url}/disclosure-trigger",
                json={
                    "corpCode": body.corp_code,
                    "source": "ui",
                    "traceId": trace_id,
                    "contractVersion": "v1",
                },
            )
            resp.raise_for_status()
            agent_data = resp.json()
    except Exception:
        return JSONResponse(
            status_code=502,
            content={
                "ok": False,
                "error": {
                    "code": "agent_unavailable",
                    "message": "저 공시리가 공시 체크 서버에 연결하지 못했습니다.",
                },
            },
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    data = read_json(WATCHLIST_PATH, default={"items": []})
    items = data.get("items", [])
    for item in items:
        if item.get("corp_code") == body.corp_code:
            item["last_checked"] = now_iso
            break
    write_json(WATCHLIST_PATH, {"items": items})

    return {
        "ok": True,
        "hasNewDisclosure": agent_data.get("hasNewDisclosure", False),
        "newDisclosureCount": agent_data.get("newDisclosureCount", 0),
    }
