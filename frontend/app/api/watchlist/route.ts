import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ items: [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json({ ok: true, corp_code: body.corp_code })
}
