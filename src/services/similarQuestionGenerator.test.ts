import { describe, expect, it } from 'vitest'
import { makePattern } from '../test/fixtures'
import type { MistakePattern } from '../types/mistake'
import type { DifficultyLevel, MathOperation } from '../types/question'
import { ALL_DIFFICULTIES, ALL_OPERATIONS } from '../utils/labels'
import { computeAnswer } from '../utils/math'
import { validateQuestion } from '../utils/validation'
import { matchesDifficulty } from './difficultyRules'
import { generateQuestion } from './questionGenerator'
import {
  generateSimilarQuestion,
  questionKey,
  similarCandidates,
  type SimilarCandidate,
} from './similarQuestionGenerator'

function pattern(
  operation: MathOperation,
  first: number,
  second: number,
  difficulty: DifficultyLevel,
): MistakePattern {
  return makePattern({
    operation,
    firstOperand: first,
    secondOperand: second,
    correctAnswer: computeAnswer(operation, first, second),
    difficulty,
  })
}

const texts = (candidates: SimilarCandidate[]) =>
  candidates.map(
    (c) =>
      `${c.firstOperand} ${{ addition: '+', subtraction: '−', multiplication: '×', division: '÷' }[c.operation]} ${c.secondOperand}`,
  )

const byStrategy = (
  candidates: SimilarCandidate[],
  strategy: SimilarCandidate['strategy'],
) => texts(candidates.filter((c) => c.strategy === strategy))

describe('similarCandidates', () => {
  it('matches the 8 × 7 example from the specification', () => {
    const candidates = similarCandidates(pattern('multiplication', 8, 7, 2))
    const all = texts(candidates)

    for (const expected of ['7 × 8', '8 × 6', '9 × 7', '56 ÷ 7', '56 ÷ 8']) {
      expect(all).toContain(expected)
    }
    expect(all).not.toContain('8 × 7')
  })

  it('uses nearby numbers for addition, at the same level', () => {
    const candidates = similarCandidates(pattern('addition', 6, 5, 1))

    expect(byStrategy(candidates, 'nearby')).toEqual(
      expect.arrayContaining(['7 + 5', '5 + 5', '6 + 6', '6 + 4']),
    )
    expect(byStrategy(candidates, 'reversed')).toEqual(['5 + 6'])
    // Level 1 addition has sums up to 20 and numbers up to 10.
    for (const c of candidates) {
      expect(
        matchesDifficulty(c.operation, 1, c.firstOperand, c.secondOperand),
      ).toBe(true)
    }
  })

  it('builds subtraction fact families from addition', () => {
    const candidates = similarCandidates(pattern('addition', 30, 15, 2))

    expect(byStrategy(candidates, 'fact-family')).toEqual([
      '45 − 30',
      '45 − 15',
    ])
  })

  it('never reverses subtraction and avoids negative answers', () => {
    const candidates = similarCandidates(pattern('subtraction', 9, 8, 1))

    expect(byStrategy(candidates, 'reversed')).toEqual([])
    expect(texts(candidates)).not.toContain('8 − 9')
    for (const c of candidates.filter((c) => c.operation === 'subtraction')) {
      expect(c.firstOperand).toBeGreaterThanOrEqual(c.secondOperand)
    }
  })

  it('builds addition fact families from subtraction', () => {
    const candidates = similarCandidates(pattern('subtraction', 9, 4, 1))

    expect(byStrategy(candidates, 'fact-family')).toEqual(['5 + 4', '4 + 5'])
  })

  it('builds division fact families from multiplication', () => {
    const candidates = similarCandidates(pattern('multiplication', 4, 3, 1))

    expect(byStrategy(candidates, 'fact-family')).toEqual(['12 ÷ 4', '12 ÷ 3'])
  })

  it('keeps division whole, never divides by zero and never reverses', () => {
    const candidates = similarCandidates(pattern('division', 56, 7, 2))

    expect(byStrategy(candidates, 'nearby')).toEqual(
      expect.arrayContaining(['63 ÷ 7', '49 ÷ 7', '64 ÷ 8', '48 ÷ 6']),
    )
    expect(byStrategy(candidates, 'reversed')).toEqual([])
    expect(byStrategy(candidates, 'fact-family')).toEqual(['7 × 8', '8 × 7'])
    for (const c of candidates.filter((c) => c.operation === 'division')) {
      expect(c.secondOperand).not.toBe(0)
      expect(c.firstOperand % c.secondOperand).toBe(0)
    }
  })

  it('drops related facts that fall outside the level', () => {
    // 315 ÷ 45 and 315 ÷ 7 are not level-3 division questions.
    const candidates = similarCandidates(pattern('multiplication', 7, 45, 3))

    expect(byStrategy(candidates, 'fact-family')).toEqual([])
    expect(candidates.length).toBeGreaterThan(0)
  })

  it('does not reverse a fact whose numbers are equal', () => {
    expect(
      byStrategy(
        similarCandidates(pattern('multiplication', 5, 5, 1)),
        'reversed',
      ),
    ).toEqual([])
  })
})

describe('generateSimilarQuestion', () => {
  it.each(
    ALL_OPERATIONS.flatMap((operation) =>
      ALL_DIFFICULTIES.map((difficulty) => [operation, difficulty] as const),
    ),
  )('makes valid %s questions at level %i', (operation, difficulty) => {
    for (let i = 0; i < 40; i++) {
      const original = generateQuestion(operation, difficulty)
      const mistake = pattern(
        operation,
        original.firstOperand,
        original.secondOperand,
        difficulty,
      )

      const question = generateSimilarQuestion(mistake)

      expect(validateQuestion(question)).toEqual([])
      expect(question.source).toBe('mistake-review')
      expect(question.mistakePatternId).toBe(mistake.id)
      expect(question.difficulty).toBe(difficulty)
      if (similarCandidates(mistake).length > 0) {
        expect(
          questionKey(
            question.operation,
            question.firstOperand,
            question.secondOperand,
          ),
        ).not.toBe(
          questionKey(operation, mistake.firstOperand, mistake.secondOperand),
        )
      }
    }
  })

  it('avoids recently shown questions when it can', () => {
    const mistake = pattern('multiplication', 8, 7, 2)
    const candidates = similarCandidates(mistake)
    const keys = candidates.map((c) =>
      questionKey(c.operation, c.firstOperand, c.secondOperand),
    )
    const avoid = new Set(keys.slice(1))

    for (let i = 0; i < 10; i++) {
      const question = generateSimilarQuestion(mistake, { avoid })
      expect(
        questionKey(
          question.operation,
          question.firstOperand,
          question.secondOperand,
        ),
      ).toBe(keys[0])
    }
  })

  it('still returns a question when everything was shown recently', () => {
    const mistake = pattern('addition', 2, 3, 1)
    const avoid = new Set(
      similarCandidates(mistake).map((c) =>
        questionKey(c.operation, c.firstOperand, c.secondOperand),
      ),
    )

    expect(
      validateQuestion(generateSimilarQuestion(mistake, { avoid })),
    ).toEqual([])
  })

  it('uses every strategy over many questions', () => {
    const mistake = pattern('multiplication', 8, 7, 2)
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const q = generateSimilarQuestion(mistake)
      seen.add(
        q.operation === 'division'
          ? 'fact-family'
          : q.firstOperand === 7 && q.secondOperand === 8
            ? 'reversed'
            : 'nearby',
      )
    }

    expect(seen).toEqual(new Set(['nearby', 'reversed', 'fact-family']))
  })
})
