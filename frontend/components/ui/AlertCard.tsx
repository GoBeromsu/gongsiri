'use client'

interface Props {
  variant: 'warn' | 'danger'
  title: string
  body: string
}

const STYLES = {
  warn:   { bg: '#FAEEDA', border: '#BA7517', titleColor: '#633806', bodyColor: '#854F0B' },
  danger: { bg: '#FCEBEB', border: '#E24B4A', titleColor: '#791F1F', bodyColor: '#A32D2D' },
}

export default function AlertCard({ variant, title, body }: Props) {
  const s = STYLES[variant]
  return (
    <div style={{ background: s.bg, borderLeft: `3px solid ${s.border}`, padding: '12px 14px' }}>
      <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.03em', color: s.titleColor, marginBottom: 3 }}>{title}</p>
      <p style={{ fontSize: 12, letterSpacing: '-0.02em', lineHeight: 1.5, color: s.bodyColor }}>{body}</p>
    </div>
  )
}
