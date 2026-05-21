import Sidebar from '@/components/layout/Sidebar'
import AgentStatusBar from '@/components/layout/AgentStatusBar'
import type { ReactNode } from 'react'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AgentStatusBar />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg-secondary)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
