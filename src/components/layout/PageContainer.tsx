import { useEffect, type ReactNode } from 'react'
import './PageContainer.css'

interface PageContainerProps {
  title: string
  children: ReactNode
}

/** Centers page content and renders the page's single <h1>. */
export function PageContainer({ title, children }: PageContainerProps) {
  useEffect(() => {
    document.title = `${title} | Math Practice`
  }, [title])

  return (
    <div className="page-container">
      <h1 className="page-container__title">{title}</h1>
      {children}
    </div>
  )
}
