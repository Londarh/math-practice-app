import type { SessionResult } from '../../types/session'
import { DIFFICULTY_LABELS, OPERATION_LABELS } from '../../utils/labels'
import { calculateAccuracy } from '../../utils/math'
import './SessionSummary.css'

/** Friendly words for the score; never shaming (spec 13.4). */
function encouragement(accuracy: number, attempted: number): string {
  if (attempted === 0) return 'No questions this time. Ready when you are!'
  if (accuracy >= 90) return 'Amazing work! You are a math star! 🌟'
  if (accuracy >= 70) return 'Great job! 🎉'
  if (accuracy >= 40) return 'Nice work! You are improving! 💪'
  return 'Keep practicing! Every try makes you stronger. 🌱'
}

export function SessionSummary({ result }: { result: SessionResult }) {
  const { session, attempts, config } = result
  const accuracy = calculateAccuracy(session.correct, session.attempted)
  const reviewCompleted = attempts.filter(
    (a) => a.source === 'mistake-review',
  ).length
  const operations = config.operations
    .map((op) => OPERATION_LABELS[op])
    .join(', ')

  const stats = [
    { label: 'Questions attempted', value: session.attempted, icon: '📝' },
    { label: 'Correct answers', value: session.correct, icon: '✅' },
    { label: 'Incorrect answers', value: session.incorrect, icon: '🔁' },
    { label: 'Accuracy', value: `${accuracy}%`, icon: '🎯' },
  ]

  return (
    <section className="session-summary" aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="session-summary__cheer">
        {encouragement(accuracy, session.attempted)}
      </h2>

      <dl className="session-summary__stats">
        {stats.map((stat) => (
          <div key={stat.label} className="session-summary__stat">
            <dt>
              <span aria-hidden="true">{stat.icon} </span>
              {stat.label}
            </dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <dl className="session-summary__details">
        <div>
          <dt>Operations practiced</dt>
          <dd>{operations}</dd>
        </div>
        <div>
          <dt>Difficulty level</dt>
          <dd>
            Level {config.difficulty}: {DIFFICULTY_LABELS[config.difficulty]}
          </dd>
        </div>
        <div>
          <dt>Mistake-review questions completed</dt>
          <dd>{reviewCompleted}</dd>
        </div>
      </dl>
    </section>
  )
}
