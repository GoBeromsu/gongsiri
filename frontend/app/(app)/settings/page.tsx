import Topbar from '@/components/layout/Topbar'

export default function SettingsPage() {
  return (
    <div>
      <Topbar title="설정" showSearch={false} />
      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--color-bg-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', letterSpacing: '-0.02em' }}>설정 페이지 — 준비 중</p>
        </div>
      </div>
    </div>
  )
}
