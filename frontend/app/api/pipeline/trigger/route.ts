import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const result = await fetch('http://localhost:8000/pipeline/trigger', { method: 'POST' })
    const data = await result.json()
    return NextResponse.json(data, { status: result.status })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'backend_unavailable', message: '파이프라인 서버에 연결할 수 없습니다.' },
      { status: 502 },
    )
  }
}
