import type { MistakePattern } from '../../types/mistake'
import { formatEquation } from '../../utils/explanations'
import { DIFFICULTY_LABELS, formatDate } from '../../utils/labels'

function MistakeItem({
  pattern,
  masteryThreshold,
}: {
  pattern: MistakePattern
  masteryThreshold: number
}) {
  const progress = Math.min(pattern.similarCorrectCount, masteryThreshold)
  return (
    <li className="mistake-list__item">
      <h3 className="mistake-list__fact">{formatEquation(pattern)}</h3>
      <dl className="mistake-list__details">
        <div>
          <dt>Times missed</dt>
          <dd>{pattern.incorrectCount}</dd>
        </div>
        <div>
          <dt>Last missed</dt>
          <dd>
            <time dateTime={pattern.lastIncorrectAt}>
              {formatDate(pattern.lastIncorrectAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd>
            {pattern.difficulty}: {DIFFICULTY_LABELS[pattern.difficulty]}
          </dd>
        </div>
      </dl>
      {pattern.mastered ? (
        <p className="mistake-list__mastered">
          <span aria-hidden="true">🏆 </span>Mastered!
        </p>
      ) : (
        <div className="mistake-list__progress">
          <div
            role="progressbar"
            aria-label={`Mastery progress for ${formatEquation(pattern)}`}
            aria-valuemin={0}
            aria-valuemax={masteryThreshold}
            aria-valuenow={progress}
            aria-valuetext={`${progress} of ${masteryThreshold} similar questions right`}
            className="counts-card__meter"
          >
            <div
              className="counts-card__meter-fill"
              style={{ width: `${(progress / masteryThreshold) * 100}%` }}
            />
          </div>
          <p className="mistake-list__progress-text">
            {progress} of {masteryThreshold} similar questions right
          </p>
        </div>
      )}
    </li>
  )
}

interface MistakeDetailsProps {
  active: readonly MistakePattern[]
  mastered: readonly MistakePattern[]
  masteryThreshold: number
}

/** Every saved mistake, with mastered ones kept in their own fold-out list. */
export function MistakeDetails({
  active,
  mastered,
  masteryThreshold,
}: MistakeDetailsProps) {
  if (active.length === 0 && mastered.length === 0) return null
  return (
    <section
      className="statistics-section"
      aria-labelledby="mistake-details-heading"
    >
      <h2 id="mistake-details-heading" className="statistics-section__title">
        Mistakes to practice
      </h2>
      {active.length === 0 ? (
        <p className="statistics-section__empty">
          You have mastered every mistake. Amazing! 🌟
        </p>
      ) : (
        <ul className="mistake-list" aria-label="Mistakes to practice">
          {active.map((pattern) => (
            <MistakeItem
              key={pattern.id}
              pattern={pattern}
              masteryThreshold={masteryThreshold}
            />
          ))}
        </ul>
      )}

      {mastered.length > 0 && (
        <details className="mistake-mastered">
          <summary className="mistake-mastered__summary">
            Mastered mistakes ({mastered.length})
          </summary>
          <ul className="mistake-list" aria-label="Mastered mistakes">
            {mastered.map((pattern) => (
              <MistakeItem
                key={pattern.id}
                pattern={pattern}
                masteryThreshold={masteryThreshold}
              />
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
