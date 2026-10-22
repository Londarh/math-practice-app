import './PageLoading.css'

/** Shown briefly while a page's code is still downloading. */
export function PageLoading() {
  return (
    <p className="page-loading" role="status">
      <span aria-hidden="true">⏳ </span>Loading…
    </p>
  )
}
