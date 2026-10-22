import { accuracyOf } from '../../services/statisticsService'
import type { AppStatistics } from '../../types/statistics'

export function StatisticsOverview({
  statistics,
}: {
  statistics: AppStatistics
}) {
  const tiles = [
    { label: 'Questions attempted', value: statistics.attempted, icon: '📝' },
    { label: 'Correct answers', value: statistics.correct, icon: '✅' },
    { label: 'Incorrect answers', value: statistics.incorrect, icon: '🔁' },
    { label: 'Accuracy', value: `${accuracyOf(statistics)}%`, icon: '🎯' },
  ]
  return (
    <section className="statistics-section" aria-labelledby="overview-heading">
      <h2 id="overview-heading" className="statistics-section__title">
        All practice
      </h2>
      <dl className="statistics-tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className="statistics-tiles__tile">
            <dt>
              <span aria-hidden="true">{tile.icon} </span>
              {tile.label}
            </dt>
            <dd>{tile.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
