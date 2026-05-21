import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { results: [], error: 'not_available', message: '종목 검색 API가 아직 연결되지 않았습니다.' },
    { status: 503 },
  )
}
