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
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ answer: `[Mock] "${question}"에 대한 답변: 공시 데이터를 기반으로 분석한 결과, 해당 종목은 현재 CB 발행 이력이 있어 주의가 필요합니다.` })
  }
}
