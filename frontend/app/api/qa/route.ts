import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { corp_code, question } = await req.json()

  try {
    const res = await fetch('http://localhost:8000/qa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corp_code, question }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { answer: '', error: 'backend_unavailable', message: 'Q&A 서버에 연결할 수 없습니다.' },
      { status: 502 },
    )
  }
}
