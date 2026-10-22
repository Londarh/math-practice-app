import { accuracyOf } from '../../services/statisticsService'
import type { PracticeSession } from '../../types/session'
import {
  DIFFICULTY_LABELS,
  formatDateTime,
  OPERATION_LABELS,
} from '../../utils/labels'

/** Recent sessions, newest first (the caller sorts them). */
export function RecentSessions({
  sessions,
}: {
  sessions: readonly PracticeSession[]
}) {
  return (
    <section className="statistics-section" aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="statistics-section__title">
        Recent sessions
      </h2>
      {sessions.length === 0 ? (
        <p className="statistics-section__empty">
          No sessions yet. Finish a practice session to see it here.
        </p>
      ) : (
        <ol className="recent-sessions">
          {sessions.map((session) => (
            <li key={session.id} className="recent-sessions__item">
              <h3 className="recent-sessions__date">
                <time dateTime={session.startedAt}>
                  {formatDateTime(session.startedAt)}
                </time>
              </h3>
              <p className="recent-sessions__chips">
                <span className="recent-sessions__chip">
                  {session.operations
                    .map((op) => OPERATION_LABELS[op])
                    .join(', ')}
                </span>
                {session.mode === 'mistake-review' ? (
                  <span className="recent-sessions__chip">
                    <span aria-hidden="true">🎯 </span>Mistake review
                  </span>
                ) : (
                  <span className="recent-sessions__chip">
                    Level {session.difficulty}:{' '}
                    {DIFFICULTY_LABELS[session.difficulty]}
                  </span>
                )}
              </p>
              <dl className="recent-sessions__counts">
                <div>
                  <dt>Attempted</dt>
                  <dd>{session.attempted}</dd>
                </div>
                <div>
                  <dt>Correct</dt>
                  <dd>{session.correct}</dd>
                </div>
                <div>
                  <dt>Incorrect</dt>
                  <dd>{session.incorrect}</dd>
                </div>
                <div>
                  <dt>Accuracy</dt>
                  <dd>{accuracyOf(session)}%</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
