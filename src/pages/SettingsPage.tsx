import { ButtonLink } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { PageContainer } from '../components/layout/PageContainer'

export function SettingsPage() {
  return (
    <PageContainer title="Settings">
      <EmptyState icon="⚙️" title="Coming soon!">
        <p>You will be able to change sounds, animations and defaults here.</p>
        <ButtonLink to="/" variant="secondary">
          Back to Home
        </ButtonLink>
      </EmptyState>
    </PageContainer>
  )
}
