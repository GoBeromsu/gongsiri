import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { items: [], error: 'not_available', message: '워치리스트 API가 아직 연결되지 않았습니다.' },
    { status: 503 },
  )
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'not_available', message: '워치리스트 저장 API가 아직 연결되지 않았습니다.' },
    { status: 503 },
  )
}
