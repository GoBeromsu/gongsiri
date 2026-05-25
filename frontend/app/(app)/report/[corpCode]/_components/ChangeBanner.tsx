'use client'

interface Props {
  prevScore: number
  currScore: number
  newFailItems: string[]
}

export default function ChangeBanner({ prevScore, currScore, newFailItems }: Props) {
  if (currScore <= prevScore && newFailItems.length === 0) return null
  const risen = currScore > prevScore

  return (
    <div style={{ background: '#FAEEDA', borderLeft: '3px solid #BA7517', padding: '10px 14px', marginBottom: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: '#633806', letterSpacing: '-0.03em' }}>
        ⚠ 직전 분석 대비 변화 감지
      </p>
      <p style={{ fontSize: 12, color: '#854F0B', marginTop: 3, letterSpacing: '-0.02em' }}>
        {risen && `위험 점수 ${prevScore} → ${currScore}점으로 상승. `}
        {newFailItems.length > 0 && `신규 위험 항목: ${newFailItems.join(', ')}`}
      </p>
    </div>
  )
}
