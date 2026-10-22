import { ButtonLink } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'

export function PracticeSetupPage() {
  return (
    <PageContainer title="Practice Setup">
      <EmptyState icon="🛠️" title="Coming soon!">
        <p>
          Soon you will choose your operations, difficulty and number of
          questions here.
        </p>
        <ButtonLink to="/" variant="secondary">
          Back to Home
        </ButtonLink>
      </EmptyState>
    </PageContainer>
  )
}
