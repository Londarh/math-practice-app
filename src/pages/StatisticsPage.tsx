import { ButtonLink } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'

export function StatisticsPage() {
  return (
    <PageContainer title="Statistics">
      <EmptyState icon="📊" title="Coming soon!">
        <p>Your scores and progress will be shown here.</p>
        <ButtonLink to="/" variant="secondary">
          Back to Home
        </ButtonLink>
      </EmptyState>
    </PageContainer>
  )
}
