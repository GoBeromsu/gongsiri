'use client'

import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import type { DemoSessionAction, DemoSessionState } from './types'
import {
  demoSessionReducer,
  selectDashboardSummary,
  selectQaStockOptions,
  selectReportSummaries,
  selectWatchlist,
} from './reducer'
import { createInitialDemoSessionState } from './seed'

interface DemoSessionContextValue {
  state: DemoSessionState
  dispatch: React.Dispatch<DemoSessionAction>
  watchlist: ReturnType<typeof selectWatchlist>
  reportSummaries: ReturnType<typeof selectReportSummaries>
  dashboardSummary: ReturnType<typeof selectDashboardSummary>
  qaStockOptions: ReturnType<typeof selectQaStockOptions>
}

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null)

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(demoSessionReducer, undefined, createInitialDemoSessionState)
  const value = useMemo(
    () => ({
      state,
      dispatch,
      watchlist: selectWatchlist(state),
      reportSummaries: selectReportSummaries(state),
      dashboardSummary: selectDashboardSummary(state),
      qaStockOptions: selectQaStockOptions(state),
    }),
    [state],
  )

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>
}

export function useDemoSession() {
  const value = useContext(DemoSessionContext)
  if (!value) {
    throw new Error('useDemoSession must be used inside DemoSessionProvider')
  }
  return value
}
