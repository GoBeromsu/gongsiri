import Topbar from '@/components/layout/Topbar'
import RiskBadge from '@/components/ui/RiskBadge'
import type { RiskLevel } from '@/lib/types'

const ALERTS = [
  { id: '1', corp_name: '코스피소형', risk_level: 'high' as RiskLevel, title: '작전주 징후 4점 이상 감지', description: 'CB 3회·최대주주 변경 2회·비정상 급등 검출', time: '2026-05-21 09:14' },
  { id: '2', corp_name: '카카오', risk_level: 'caution' as RiskLevel, title: '주요사항보고서 신규 공시', description: 'CB 추가 발행 검토 내용 포함', time: '2026-05-21 08:52' },
  { id: '3', corp_name: '삼성전자', risk_level: 'normal' as RiskLevel, title: '분기보고서', description: '이상 시그널 없음, 분석 완료', time: '2026-05-21 08:30' },
]

export default function DisclosuresPage() {
  return (
    <div>
      <Topbar title="공시 알림" showSearch={false} />
      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--color-bg-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {ALERTS.map((a, i) => (
            <div key={a.id} style={{ padding: '14px 16px', borderBottom: i < ALERTS.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiskBadge level={a.risk_level} size="sm" />
                  <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.03em' }}>{a.corp_name}</span>
                </div>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{a.time}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 3 }}>{a.title}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', letterSpacing: '-0.02em', lineHeight: 1.5 }}>{a.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
