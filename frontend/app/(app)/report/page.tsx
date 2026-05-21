import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import RiskBadge from '@/components/ui/RiskBadge'
import type { RiskLevel } from '@/lib/types'

const REPORTS = [
  { corp_code: '00258801', corp_name: '카카오', risk_level: 'caution' as RiskLevel, risk_score: 2, analyzed_at: '2026-05-21 09:14' },
  { corp_code: '00126380', corp_name: '삼성전자', risk_level: 'normal' as RiskLevel, risk_score: 0, analyzed_at: '2026-05-21 08:52' },
  { corp_code: '00247540', corp_name: '에코프로비엠', risk_level: 'normal' as RiskLevel, risk_score: 1, analyzed_at: '2026-05-20 18:30' },
]

export default function ReportListPage() {
  return (
    <div>
      <Topbar title="리포트" showSearch={false} />
      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--color-bg-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {REPORTS.map((r, i) => (
            <Link key={r.corp_code} href={`/report/${r.corp_code}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '14px 16px', borderBottom: i < REPORTS.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.03em' }}>{r.corp_name}</p>
                  <p className="font-mono" style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{r.analyzed_at} 분석</p>
                </div>
                <RiskBadge level={r.risk_level} size="sm" />
                <p className="font-mono" style={{ fontSize: 12, color: 'var(--color-text-tertiary)', minWidth: 32, textAlign: 'right' }}>{r.risk_score}/6</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
