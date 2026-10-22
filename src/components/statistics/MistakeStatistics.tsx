import type { MistakeSummary } from '../../services/statisticsService'
import { formatEquation } from '../../utils/explanations'
import { OPERATION_LABELS } from '../../utils/labels'

const times = (count: number) => (count === 1 ? '1 time' : `${count} times`)

/** Totals for mistake review, plus the operations and facts missed most. */
export function MistakeStatistics({ summary }: { summary: MistakeSummary }) {
  const { active, mastered, mostMissed, frequentFacts } = summary
  const tiles = [
    { label: 'Mistakes to practice', value: active.length, icon: '🎯' },
    { label: 'Mistakes mastered', value: mastered.length, icon: '🏆' },
    {
      label: 'Similar questions practiced',
      value: summary.similarPracticed,
      icon: '🔁',
    },
    {
      label: 'Review questions answered correctly',
      value: summary.reviewCorrect,
      icon: '✅',
    },
  ]

  return (
    <section className="statistics-section" aria-labelledby="mistakes-heading">
      <h2 id="mistakes-heading" className="statistics-section__title">
        Mistake review
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

      {frequentFacts.length === 0 ? (
        <p className="statistics-section__empty">
          No mistakes saved yet. Questions you get wrong will show up here so
          you can practice them.
        </p>
      ) : (
        <div className="mistake-highlights">
          <div className="mistake-highlights__card">
            <h3 className="mistake-highlights__title">Most missed operation</h3>
            <p className="mistake-highlights__value">
              {mostMissed.operations
                .map((op) => OPERATION_LABELS[op])
                .join(' and ')}
            </p>
            <p className="mistake-highlights__note">
              Missed {times(mostMissed.misses)}
              {mostMissed.operations.length > 1 ? ' each' : ''}
            </p>
          </div>
          <div className="mistake-highlights__card">
            <h3 className="mistake-highlights__title">Most missed facts</h3>
            <ol className="mistake-highlights__facts">
              {frequentFacts.map((pattern) => (
                <li key={pattern.id}>
                  <span className="mistake-highlights__fact">
                    {formatEquation(pattern)}
                  </span>
                  <span className="mistake-highlights__note">
                    missed {times(pattern.incorrectCount)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  )
}
