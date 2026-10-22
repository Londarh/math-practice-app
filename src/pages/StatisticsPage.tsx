import { useState } from 'react'
import { Button, ButtonLink } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'
import { DifficultyStatistics } from '../components/statistics/DifficultyStatistics'
import { MistakeDetails } from '../components/statistics/MistakeDetails'
import { MistakeStatistics } from '../components/statistics/MistakeStatistics'
import { OperationStatistics } from '../components/statistics/OperationStatistics'
import { RecentSessions } from '../components/statistics/RecentSessions'
import { StatisticsOverview } from '../components/statistics/StatisticsOverview'
import { useStatistics } from '../hooks/useStatistics'
import '../components/statistics/Statistics.css'

const RESET_CONFIRMATION =
  'Are you sure you want to erase all practice history and statistics?'

export function StatisticsPage() {
  const {
    statistics,
    recentSessions,
    mistakes,
    masteryThreshold,
    hasPractice,
    resetStatistics,
  } = useStatistics()
  // Saved mistakes outlive a statistics reset, so show them either way.
  const hasMistakes = mistakes.active.length + mistakes.mastered.length > 0
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  return (
    <PageContainer title="Statistics">
      <div className="statistics-page">
        {resetDone && (
          <p className="statistics-page__notice" role="status">
            Your practice history and statistics were erased.
          </p>
        )}

        {statistics.attempted === 0 ? (
          <EmptyState icon="📊" title="No practice yet">
            <p>
              Answer some questions and your scores and progress will show up
              here.
            </p>
            <ButtonLink to="/practice/setup" variant="success" icon="🚀">
              Start Practice
            </ButtonLink>
          </EmptyState>
        ) : (
          <>
            <StatisticsOverview statistics={statistics} />
            <OperationStatistics statistics={statistics} />
            <DifficultyStatistics statistics={statistics} />
          </>
        )}

        {(hasPractice || hasMistakes) && (
          <>
            <MistakeStatistics summary={mistakes} />
            <MistakeDetails
              active={mistakes.active}
              mastered={mistakes.mastered}
              masteryThreshold={masteryThreshold}
            />
          </>
        )}

        {hasPractice && (
          <>
            <RecentSessions sessions={recentSessions} />
            <div className="statistics-page__reset">
              <Button
                variant="secondary"
                icon="🗑️"
                onClick={() => setConfirmingReset(true)}
              >
                Reset Statistics
              </Button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmingReset}
        title="Reset statistics?"
        message={`${RESET_CONFIRMATION} Your settings and saved mistakes to practice will stay.`}
        confirmLabel="Yes, erase it"
        cancelLabel="No, keep it"
        onConfirm={() => {
          resetStatistics()
          setConfirmingReset(false)
          setResetDone(true)
        }}
        onCancel={() => setConfirmingReset(false)}
      />
    </PageContainer>
  )
}
