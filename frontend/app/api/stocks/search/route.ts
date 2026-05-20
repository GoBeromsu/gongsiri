import { NextRequest, NextResponse } from 'next/server'

const MOCK = [
  { corp_name: '카카오', stock_code: '035720', corp_code: '00258801', market: 'KOSPI' },
  { corp_name: '카카오뱅크', stock_code: '323410', corp_code: '00410100', market: 'KOSPI' },
  { corp_name: '삼성전자', stock_code: '005930', corp_code: '00126380', market: 'KOSPI' },
  { corp_name: '에코프로비엠', stock_code: '247540', corp_code: '00247540', market: 'KOSDAQ' },
]

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const results = MOCK.filter(s => s.corp_name.includes(q) || s.stock_code.includes(q))
  return NextResponse.json({ results })
}
