'use client'
import type { RiskLevel } from '@/lib/types'

const CONFIG = {
  normal:  { label: '안전', bg: '#EAF3DE', color: '#3B6D11', dot: '#639922' },
  caution: { label: '주의', bg: '#FAEEDA', color: '#854F0B', dot: '#BA7517' },
  high:    { label: '위험', bg: '#FCEBEB', color: '#A32D2D', dot: '#E24B4A' },
}

interface Props {
  level: RiskLevel
  size?: 'sm' | 'md'
}

export default function RiskBadge({ level, size = 'md' }: Props) {
  const c = CONFIG[level]
  const pad = size === 'sm' ? '2px 8px' : '4px 12px'
  const fs = size === 'sm' ? 11 : 12

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.color,
      borderRadius: 100, padding: pad,
      fontSize: fs, fontWeight: 500, letterSpacing: '-0.02em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: size === 'sm' ? 5 : 6, height: size === 'sm' ? 5 : 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}
