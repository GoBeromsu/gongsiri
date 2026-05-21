import Topbar from '@/components/layout/Topbar'
import RiskBadge from '@/components/ui/RiskBadge'
import ChecklistPanel from './_components/ChecklistPanel'
import ReportSection from './_components/ReportSection'
import ChangeBanner from './_components/ChangeBanner'
import type { AnalysisResult } from '@/lib/types'

const MOCK_RESULT: AnalysisResult = {
  risk_score: 2,
  risk_level: 'caution',
  checklist: [
    { id: 'business-purpose-change', title: '사업목적 전환 이력', status: 'pass', score: 0, reason: '사업목적 변경 관련 징후가 감지되지 않았습니다.', evidence: [], solar_explanation: '최근 3년간 정관 변경 또는 사업목적 추가 공시가 확인되지 않았습니다. 현재 주력 사업을 유지하고 있는 것으로 판단됩니다.' },
    { id: 'hot-theme-following', title: '핫 테마 후행 참여', status: 'fail', score: 1, reason: '핫 테마 키워드가 반복 언급되었습니다.', evidence: ['AI 모빌리티 사업 진출 발표', 'AI 헬스케어 협약 체결'], solar_explanation: 'AI 관련 테마 키워드가 최근 공시 및 뉴스에서 2회 이상 반복 등장하고 있습니다. 실질적인 사업 연관성보다 테마 편승 가능성을 배제할 수 없습니다.' },
    { id: 'capital-structure-change', title: '주식 구조 변경 + 신사업 동시 발생', status: 'fail', score: 1, reason: '자본/지배구조 관련 공시가 감지되었습니다.', evidence: ['전환사채 발행 결정 20250311'], solar_explanation: '전환사채 발행이 감지되었으며, 동 시기 신사업 발표가 병행되었습니다. 자본구조 변경과 신사업 진출이 동시에 발생하는 패턴은 작전주에서 자주 관찰됩니다.' },
    { id: 'abnormal-price-surge', title: '비정상 주가 급등', status: 'pass', score: 0, reason: '가격/거래량 급등이 임계값 미만입니다.', evidence: ['monthly_return_max=12.0', 'volume_spike_ratio=1.3'], solar_explanation: '주가 변동률 및 거래량 급증 비율이 정상 범위 내에 있습니다. 별도의 이상 시그널은 관찰되지 않습니다.' },
    { id: 'risky-history', title: '관리종목·CB·감자·최대주주 변경 이력', status: 'pass', score: 0, reason: '위험 이력 공시가 감지되지 않았습니다.', evidence: [], solar_explanation: '감자, 관리종목 지정, 최대주주 변경 등 주요 위험 이력이 검색 기간 내 확인되지 않았습니다.' },
    { id: 'performance-divergence', title: '실적 없는 급등 / 실적 괴리', status: 'unknown', score: 0, reason: '재무 근거가 부족합니다.', evidence: ['revenue=None', 'operating_income=None'], solar_explanation: '재무 데이터가 충분히 수집되지 않아 실적 괴리 여부를 판단할 수 없습니다. 추가 데이터 확보 후 재분석이 필요합니다.' },
  ],
  short_term_report: '카카오는 단기적으로 전환사채 발행과 AI 테마 편승 가능성으로 인한 변동성 확대가 예상됩니다. CB 발행에 따른 주식 희석 우려와 함께, 테마 소멸 시 조정 가능성을 유의해야 합니다.',
  long_term_report: '장기적으로는 실질 사업 성과와 재무 건전성 회복 여부가 핵심 변수입니다. 현재 공시된 신사업의 실질 매출 기여도 및 CB 상환 일정에 따른 재무 부담을 지속 모니터링해야 합니다.',
  disclaimer: '본 리포트는 공시·시세·뉴스 데이터 기반 참고 자료이며 투자 판단을 대체하지 않습니다.',
  missing_evidence: ['financials'],
}

export default async function ReportDetailPage({ params }: { params: Promise<{ corpCode: string }> }) {
  const { corpCode } = await params
  const result = MOCK_RESULT
  const isHigh = result.risk_level === 'high'

  return (
    <div>
      <Topbar title="리포트 상세" showSearch={false} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <ChangeBanner prevScore={1} currScore={result.risk_score} newFailItems={['핫 테마 후행 참여']} />

        {/* Header */}
        {(() => {
          const headerBg = result.risk_level === 'high' ? '#FCEBEB' : result.risk_level === 'caution' ? '#FAEEDA' : '#EAF3DE'
          const headerBorder = result.risk_level === 'high' ? '#E24B4A' : result.risk_level === 'caution' ? '#BA7517' : '#639922'
          const scoreColor = result.risk_level === 'high' ? '#E24B4A' : result.risk_level === 'caution' ? '#BA7517' : '#639922'
          return (
            <div style={{ background: headerBg, border: `0.5px solid ${headerBorder}`, borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', letterSpacing: '-0.01em', marginBottom: 4 }}>종목코드 {corpCode}</p>
                <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.04em' }}>카카오</p>
              </div>
              <RiskBadge level={result.risk_level} />
              <div style={{ textAlign: 'right' }}>
                <p className="font-mono" style={{ fontSize: 28, fontWeight: 500, color: scoreColor, letterSpacing: '-0.02em' }}>
                  {result.risk_score}<span style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}> / 6</span>
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', letterSpacing: '-0.01em' }}>작전주 점수</p>
              </div>
            </div>
          )
        })()}

        {/* Checklist */}
        <ChecklistPanel checklist={result.checklist} />

        {/* Reports */}
        {isHigh ? (
          <ReportSection title="⚠ 위험 경고 리포트" content={result.short_term_report} variant="warning" />
        ) : (
          <>
            <ReportSection title="단기 분석 (1~3개월)" content={result.short_term_report} />
            {result.long_term_report && <ReportSection title="장기 분석 (6개월 이상)" content={result.long_term_report} />}
          </>
        )}

        {/* Disclaimer */}
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', letterSpacing: '-0.01em', textAlign: 'center', paddingBottom: 8 }}>
          {result.disclaimer}
        </p>
      </div>
    </div>
  )
}
