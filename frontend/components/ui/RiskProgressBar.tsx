'use client'
import type { RiskLevel } from '@/lib/types'

const BAR_COLOR: Record<RiskLevel, string> = {
  normal:  '#639922',
  caution: '#BA7517',
  high:    '#E24B4A',
}

interface Props {
  score: number
  maxScore?: number
  level?: RiskLevel
}

export default function RiskProgressBar({ score, maxScore = 6, level = 'normal' }: Props) {
  const pct = Math.min((score / maxScore) * 100, 100)
  const color = BAR_COLOR[level]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 3 }}>
        <span>{score} / {maxScore}</span>
      </div>
      <div style={{ height: 4, background: 'var(--color-bg-secondary)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}
