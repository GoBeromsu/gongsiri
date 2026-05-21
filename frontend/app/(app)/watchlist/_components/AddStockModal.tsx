'use client'
import { useState } from 'react'
import { IconX } from '@tabler/icons-react'
import SearchInput from './SearchInput'
import Button from '@/components/ui/Button'
import type { CompanyInfo } from '@/lib/types'

interface Props {
  onClose: () => void
  onAdded: () => void
}

export default function AddStockModal({ onClose, onAdded }: Props) {
  const [selected, setSelected] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleAdd() {
    if (!selected) return
    setLoading(true)
    try {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corp_code: selected.corp_code, corp_name: selected.corp_name, stock_code: selected.stock_code, market: selected.market }),
      })
      setDone(true)
      setTimeout(() => { onAdded(); onClose() }, 1200)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', padding: 24, width: 400, position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.04em' }}>종목 추가</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}><IconX size={18} /></button>
        </div>

        <SearchInput onSelect={setSelected} />

        {selected && (
          <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--color-border-tertiary)' }}>
            <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.03em' }}>{selected.corp_name}</p>
            <p className="font-mono" style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              {selected.stock_code} · {selected.market}
            </p>
          </div>
        )}

        {done && (
          <p style={{ marginTop: 12, fontSize: 13, color: '#639922', letterSpacing: '-0.02em' }}>
            ✓ 등록 완료 — 분석 파이프라인 시작됨
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleAdd} disabled={!selected || loading}>
            {loading ? '등록 중...' : '종목 추가'}
          </Button>
        </div>
      </div>
    </div>
  )
}
