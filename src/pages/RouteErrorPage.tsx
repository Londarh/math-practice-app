import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { ErrorState } from '../components/common/ErrorState'
import { PageContainer } from '../components/layout/PageContainer'
import { logDevError } from '../utils/devLog'

/** Shown instead of a page that crashed, with the header still in place. */
export function RouteErrorPage() {
  const error = useRouteError()

  useEffect(() => {
    logDevError('A page failed to render', error)
  }, [error])

  return (
    <PageContainer title="Something went wrong">
      <ErrorState canRetry />
    </PageContainer>
  )
}
