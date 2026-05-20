import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const result = await fetch('http://localhost:8000/pipeline/trigger', { method: 'POST' })
    const data = await result.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ ok: true, traceId: 'mock-trigger' })
  }
}
