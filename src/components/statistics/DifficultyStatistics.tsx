import type { AppStatistics } from '../../types/statistics'
import { ALL_DIFFICULTIES, DIFFICULTY_LABELS } from '../../utils/labels'
import { CountsCard } from './CountsCard'

export function DifficultyStatistics({
  statistics,
}: {
  statistics: AppStatistics
}) {
  return (
    <section
      className="statistics-section"
      aria-labelledby="by-difficulty-heading"
    >
      <h2 id="by-difficulty-heading" className="statistics-section__title">
        By level
      </h2>
      <div className="statistics-grid">
        {ALL_DIFFICULTIES.map((level) => (
          <CountsCard
            key={level}
            title={`Level ${level}: ${DIFFICULTY_LABELS[level]}`}
            symbol={String(level)}
            counts={statistics.byDifficulty[level]}
          />
        ))}
      </div>
    </section>
  )
}
