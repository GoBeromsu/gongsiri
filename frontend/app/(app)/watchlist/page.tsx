'use client'
import { useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import RiskBadge from '@/components/ui/RiskBadge'
import RiskProgressBar from '@/components/ui/RiskProgressBar'
import AddStockModal from './_components/AddStockModal'
import type { WatchlistItem } from '@/lib/types'
import { IconTrash } from '@tabler/icons-react'

const MOCK: WatchlistItem[] = [
  { corp_code: '00258801', corp_name: '카카오', stock_code: '035720', market: 'KOSPI', price: 42650, change_rate: 1.2, risk_level: 'caution', risk_score: 2 },
  { corp_code: '00126380', corp_name: '삼성전자', stock_code: '005930', market: 'KOSPI', price: 75400, change_rate: -0.5, risk_level: 'normal', risk_score: 0 },
  { corp_code: '00247540', corp_name: '에코프로비엠', stock_code: '247540', market: 'KOSDAQ', price: 128900, change_rate: 3.8, risk_level: 'normal', risk_score: 1 },
]

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>(MOCK)
  const [showModal, setShowModal] = useState(false)

  function removeItem(corp_code: string) {
    setItems(prev => prev.filter(i => i.corp_code !== corp_code))
  }

  return (
    <div>
      <Topbar title="워치리스트" ctaLabel="종목 추가" onCta={() => setShowModal(true)} />
      {showModal && <AddStockModal onClose={() => setShowModal(false)} onAdded={() => {}} />}

      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--color-bg-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 72px 80px 120px 40px', padding: '7px 16px', background: 'var(--color-bg-secondary)', gap: 8 }}>
            {['종목', '현재가', '등락', '리스크', '작전주 지수', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', fontWeight: 500, textAlign: i >= 1 && i <= 2 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {items.map(item => (
            <div key={item.corp_code} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 72px 80px 120px 40px', padding: '12px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', alignItems: 'center', gap: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{item.corp_name}</p>
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{item.stock_code} · {item.market}</p>
              </div>
              <p className="font-mono" style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{item.price?.toLocaleString()}</p>
              <p className="font-mono" style={{ fontSize: 12, textAlign: 'right', color: (item.change_rate ?? 0) >= 0 ? '#E24B4A' : '#185FA5' }}>
                {(item.change_rate ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(item.change_rate ?? 0)}%
              </p>
              <RiskBadge level={item.risk_level ?? 'normal'} size="sm" />
              <RiskProgressBar score={item.risk_score ?? 0} level={item.risk_level ?? 'normal'} />
              <button onClick={() => removeItem(item.corp_code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
