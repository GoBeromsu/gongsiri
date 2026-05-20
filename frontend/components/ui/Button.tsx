'use client'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  size?: 'sm' | 'md'
}

export default function Button({ children, variant = 'primary', onClick, disabled, type = 'button', size = 'md' }: Props) {
  const pad = size === 'sm' ? '5px 12px' : '8px 16px'
  const fs = size === 'sm' ? 12 : 13

  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: fs, fontWeight: 500, letterSpacing: '-0.02em',
    fontFamily: 'Noto Sans KR, sans-serif',
    padding: pad, border: 'none', borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.15s',
    whiteSpace: 'nowrap' as const,
  }

  const styles: React.CSSProperties = variant === 'primary'
    ? { ...base, background: 'var(--color-navy)', color: '#E8F4FF' }
    : { ...base, background: 'transparent', color: 'var(--color-text-primary)', border: '0.5px solid var(--color-border-secondary)', fontWeight: 400 }

  return <button type={type} style={styles} onClick={onClick} disabled={disabled}>{children}</button>
}
