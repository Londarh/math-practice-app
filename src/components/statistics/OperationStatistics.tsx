import type { AppStatistics } from '../../types/statistics'
import {
  ALL_OPERATIONS,
  OPERATION_LABELS,
  OPERATION_SYMBOLS,
} from '../../utils/labels'
import { CountsCard } from './CountsCard'

export function OperationStatistics({
  statistics,
}: {
  statistics: AppStatistics
}) {
  return (
    <section
      className="statistics-section"
      aria-labelledby="by-operation-heading"
    >
      <h2 id="by-operation-heading" className="statistics-section__title">
        By operation
      </h2>
      <div className="statistics-grid">
        {ALL_OPERATIONS.map((operation) => (
          <CountsCard
            key={operation}
            title={OPERATION_LABELS[operation]}
            symbol={OPERATION_SYMBOLS[operation]}
            counts={statistics.byOperation[operation]}
          />
        ))}
      </div>
    </section>
  )
}
