import { accuracyOf } from '../../services/statisticsService'
import type { OperationStatistics } from '../../types/statistics'

interface CountsCardProps {
  title: string
  /** Decorative symbol shown next to the title. */
  symbol: string
  counts: OperationStatistics
}

/** Attempted, correct and incorrect totals with accuracy, for one group. */
export function CountsCard({ title, symbol, counts }: CountsCardProps) {
  const accuracy = accuracyOf(counts)
  return (
    <article className="counts-card">
      <h3 className="counts-card__title">
        <span className="counts-card__symbol" aria-hidden="true">
          {symbol}
        </span>
        {title}
      </h3>
      {counts.attempted === 0 ? (
        <p className="counts-card__empty">Not practiced yet</p>
      ) : (
        <>
          <dl className="counts-card__counts">
            <div>
              <dt>Attempted</dt>
              <dd>{counts.attempted}</dd>
            </div>
            <div>
              <dt>Correct</dt>
              <dd>{counts.correct}</dd>
            </div>
            <div>
              <dt>Incorrect</dt>
              <dd>{counts.incorrect}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{accuracy}%</dd>
            </div>
          </dl>
          <div className="counts-card__meter" aria-hidden="true">
            <div
              className="counts-card__meter-fill"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </>
      )}
    </article>
  )
}
