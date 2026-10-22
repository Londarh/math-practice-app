import type { PracticeAttempt, PracticeSession } from '../types/session'
import type { AppStatistics, OperationStatistics } from '../types/statistics'
import { ALL_DIFFICULTIES, ALL_OPERATIONS } from '../utils/labels'
import { calculateAccuracy } from '../utils/math'

/** How many sessions the statistics page lists. */
export const RECENT_SESSION_COUNT = 10

export function emptyCounts(): OperationStatistics {
  return { attempted: 0, correct: 0, incorrect: 0 }
}

export function emptyStatistics(): AppStatistics {
  return {
    ...emptyCounts(),
    byOperation: Object.fromEntries(
      ALL_OPERATIONS.map((op) => [op, emptyCounts()]),
    ) as AppStatistics['byOperation'],
    byDifficulty: Object.fromEntries(
      ALL_DIFFICULTIES.map((level) => [level, emptyCounts()]),
    ) as AppStatistics['byDifficulty'],
    reviewAttempted: 0,
    reviewCorrect: 0,
  }
}

function addToCounts(
  counts: OperationStatistics,
  correct: boolean,
): OperationStatistics {
  return {
    attempted: counts.attempted + 1,
    correct: counts.correct + (correct ? 1 : 0),
    incorrect: counts.incorrect + (correct ? 0 : 1),
  }
}

/** Returns new statistics with one more attempt counted; the input is unchanged. */
export function addAttemptToStatistics(
  statistics: AppStatistics,
  attempt: PracticeAttempt,
): AppStatistics {
  const correct = attempt.selfReportedCorrect
  const isReview = attempt.source === 'mistake-review'
  return {
    ...addToCounts(statistics, correct),
    byOperation: {
      ...statistics.byOperation,
      [attempt.operation]: addToCounts(
        statistics.byOperation[attempt.operation],
        correct,
      ),
    },
    byDifficulty: {
      ...statistics.byDifficulty,
      [attempt.difficulty]: addToCounts(
        statistics.byDifficulty[attempt.difficulty],
        correct,
      ),
    },
    reviewAttempted: statistics.reviewAttempted + (isReview ? 1 : 0),
    reviewCorrect: statistics.reviewCorrect + (isReview && correct ? 1 : 0),
  }
}

/** Builds statistics from scratch, e.g. when the stored totals are broken. */
export function calculateStatistics(
  attempts: readonly PracticeAttempt[],
): AppStatistics {
  return attempts.reduce(addAttemptToStatistics, emptyStatistics())
}

/** Accuracy as a whole percentage; 0 when nothing was attempted. */
export function accuracyOf(counts: OperationStatistics): number {
  return calculateAccuracy(counts.correct, counts.attempted)
}

/** The newest sessions first, skipping sessions with no answers. */
export function recentSessions(
  sessions: readonly PracticeSession[],
  limit = RECENT_SESSION_COUNT,
): PracticeSession[] {
  return sessions
    .filter((session) => session.attempted > 0)
    .toSorted((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, limit)
}
