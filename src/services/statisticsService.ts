import type { MistakePattern } from '../types/mistake'
import type { MathOperation } from '../types/question'
import type { PracticeAttempt, PracticeSession } from '../types/session'
import type { AppStatistics, OperationStatistics } from '../types/statistics'
import { ALL_DIFFICULTIES, ALL_OPERATIONS } from '../utils/labels'
import { calculateAccuracy } from '../utils/math'
import { factKey, isActivePattern } from './mistakeService'

/** How many sessions the statistics page lists. */
export const RECENT_SESSION_COUNT = 10

/** How many of the most-missed facts the statistics page lists. */
export const FREQUENT_FACT_COUNT = 5

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

/**
 * Most missed first. Ties go to the more recently missed fact, then to a
 * fixed order, so the list never jumps around between visits.
 */
export function sortByIncorrectCount(
  patterns: readonly MistakePattern[],
): MistakePattern[] {
  return patterns.toSorted(
    (a, b) =>
      b.incorrectCount - a.incorrectCount ||
      Date.parse(b.lastIncorrectAt) - Date.parse(a.lastIncorrectAt) ||
      factKey(a.operation, a.firstOperand, a.secondOperand).localeCompare(
        factKey(b.operation, b.firstOperand, b.secondOperand),
      ),
  )
}

/**
 * The operation(s) with the most misses across all mistake patterns. Several
 * operations are returned when they are tied; none when nothing was missed.
 */
export function mostMissedOperations(patterns: readonly MistakePattern[]): {
  operations: MathOperation[]
  misses: number
} {
  const misses = Object.fromEntries(
    ALL_OPERATIONS.map((op) => [op, 0]),
  ) as Record<MathOperation, number>
  for (const pattern of patterns) {
    misses[pattern.operation] += pattern.incorrectCount
  }
  const most = Math.max(...Object.values(misses))
  if (most === 0) return { operations: [], misses: 0 }
  return {
    operations: ALL_OPERATIONS.filter((op) => misses[op] === most),
    misses: most,
  }
}

export interface MistakeSummary {
  active: MistakePattern[]
  mastered: MistakePattern[]
  /** Similar questions answered in mistake review. */
  similarPracticed: number
  /** Similar questions answered correctly. */
  reviewCorrect: number
  mostMissed: ReturnType<typeof mostMissedOperations>
  frequentFacts: MistakePattern[]
}

export function summarizeMistakes(
  patterns: readonly MistakePattern[],
  statistics: AppStatistics,
  factLimit = FREQUENT_FACT_COUNT,
): MistakeSummary {
  const sorted = sortByIncorrectCount(patterns)
  return {
    active: sorted.filter(isActivePattern),
    mastered: sorted.filter((p) => !isActivePattern(p)),
    similarPracticed: statistics.reviewAttempted,
    reviewCorrect: statistics.reviewCorrect,
    mostMissed: mostMissedOperations(patterns),
    frequentFacts: sorted.slice(0, factLimit),
  }
}
