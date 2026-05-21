'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function ReanalyzeButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      size="sm"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
    >
      {pending ? '재분석 중...' : '지금 재분석'}
    </Button>
  )
}
