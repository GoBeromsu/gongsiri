'use client'

interface Props {
  value: number | string
  label: string
  sub?: string
  valueColor?: string
}

export default function MetricCard({ value, label, sub, valueColor }: Props) {
  return (
    <div style={{
      background: 'var(--color-bg-primary)',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
    }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: valueColor ?? 'var(--color-text-primary)' }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3, letterSpacing: '-0.01em' }}>{label}</p>
      {sub && <p style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', marginTop: 4, color: valueColor ?? 'var(--color-text-tertiary)' }}>{sub}</p>}
    </div>
  )
}
