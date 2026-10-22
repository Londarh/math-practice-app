import { ButtonLink } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'

export function SessionSummaryPage() {
  return (
    <PageContainer title="Session Summary">
      <EmptyState icon="🏁" title="Coming soon!">
        <p>After a practice session, you will see how you did here.</p>
        <ButtonLink to="/" variant="secondary">
          Back to Home
        </ButtonLink>
      </EmptyState>
    </PageContainer>
  )
}
