import { ButtonLink } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'

export function PracticePage() {
  return (
    <PageContainer title="Practice">
      <EmptyState icon="🃏" title="Coming soon!">
        <p>Your math cards will appear here.</p>
        <ButtonLink to="/" variant="secondary">
          Back to Home
        </ButtonLink>
      </EmptyState>
    </PageContainer>
  )
}
