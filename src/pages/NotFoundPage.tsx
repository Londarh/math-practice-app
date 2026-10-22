import { ButtonLink } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'

export function NotFoundPage() {
  return (
    <PageContainer title="Page not found">
      <EmptyState icon="🧭" title="Oops! This page got lost.">
        <p>Let's head back home and keep practicing.</p>
        <ButtonLink to="/" variant="primary">
          Go to Home
        </ButtonLink>
      </EmptyState>
    </PageContainer>
  )
}
