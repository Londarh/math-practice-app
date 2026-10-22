import type {
  DifficultyLevel,
  MathOperation,
  Question,
  QuestionSource,
} from '../types/question'
import { createId } from '../utils/ids'
import { formatQuestionText } from '../utils/labels'
import {
  computeAnswer,
  randomInt,
  randomItem,
  type RandomSource,
} from '../utils/math'
import { logDevError } from '../utils/devLog'
import { validateQuestion } from '../utils/validation'
import { buildChoices } from './answerChoices'
import { DIFFICULTY_RULES, negativesAllowed } from './difficultyRules'

/** How many times to retry before giving up on a broken question. */
export const MAX_GENERATION_ATTEMPTS = 20

export interface GenerateOptions {
  random?: RandomSource
  /** Level 4 only: let subtraction answers go below zero (spec 7.4). */
  allowNegativeSubtraction?: boolean
}

export class QuestionGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuestionGenerationError'
  }
}

type Operands = [first: number, second: number]

/**
 * Known-good operands for each operation and level, used only if random
 * generation keeps failing validation, so practice can always go on.
 */
export const FALLBACK_OPERANDS: Record<
  MathOperation,
  Record<DifficultyLevel, Operands>
> = {
  addition: { 1: [2, 3], 2: [12, 15], 3: [34, 27], 4: [120, 45] },
  subtraction: { 1: [9, 4], 2: [35, 12], 3: [72, 38], 4: [540, 125] },
  multiplication: { 1: [3, 4], 2: [6, 7], 3: [7, 8], 4: [12, 9] },
  division: { 1: [12, 3], 2: [42, 6], 3: [96, 8], 4: [312, 12] },
}

export function generateAdditionOperands(
  difficulty: DifficultyLevel,
  random: RandomSource = Math.random,
): Operands {
  const { operand, maxResult } = DIFFICULTY_RULES.addition[difficulty]
  const first = randomInt(operand.min, operand.max, random)
  const secondMax =
    maxResult === undefined
      ? operand.max
      : Math.min(operand.max, maxResult - first)
  return [first, randomInt(operand.min, secondMax, random)]
}

export function generateSubtractionOperands(
  difficulty: DifficultyLevel,
  random: RandomSource = Math.random,
  allowNegative = false,
): Operands {
  const { operand } = DIFFICULTY_RULES.subtraction[difficulty]
  const a = randomInt(operand.min, operand.max, random)
  const b = randomInt(operand.min, operand.max, random)
  if (negativesAllowed('subtraction', difficulty, allowNegative)) return [a, b]
  // Put the larger number first so the answer is never negative.
  return a >= b ? [a, b] : [b, a]
}

export function generateMultiplicationOperands(
  difficulty: DifficultyLevel,
  random: RandomSource = Math.random,
): Operands {
  const shape = randomItem(
    DIFFICULTY_RULES.multiplication[difficulty].shapes,
    random,
  )
  const a = randomInt(shape.first.min, shape.first.max, random)
  const b = randomInt(shape.second.min, shape.second.max, random)
  // Mix the order so the smaller factor is not always on the same side.
  return random() < 0.5 ? [a, b] : [b, a]
}

/** Returns [dividend, divisor], built as divisor × quotient (spec section 9). */
export function generateDivisionOperands(
  difficulty: DifficultyLevel,
  random: RandomSource = Math.random,
): Operands {
  const rule = DIFFICULTY_RULES.division[difficulty]
  // The divisor's minimum is at least 1 at every level, so it is never zero.
  const divisor = randomInt(
    Math.max(1, rule.divisor.min),
    rule.divisor.max,
    random,
  )
  let quotientMin = rule.quotient.min
  let quotientMax = rule.quotient.max
  if (rule.dividend) {
    quotientMin = Math.max(quotientMin, Math.ceil(rule.dividend.min / divisor))
    quotientMax = Math.min(quotientMax, Math.floor(rule.dividend.max / divisor))
  }
  const quotient = randomInt(quotientMin, quotientMax, random)
  return [divisor * quotient, divisor]
}

const operandGenerators: Record<
  MathOperation,
  (
    difficulty: DifficultyLevel,
    random: RandomSource,
    allowNegative: boolean,
  ) => Operands
> = {
  addition: generateAdditionOperands,
  subtraction: generateSubtractionOperands,
  multiplication: generateMultiplicationOperands,
  division: generateDivisionOperands,
}

export interface CreateQuestionInput {
  operation: MathOperation
  firstOperand: number
  secondOperand: number
  difficulty: DifficultyLevel
  source?: QuestionSource
  mistakePatternId?: string
}

/** Builds a full question (text, answer, choices) from known operands. */
export function createQuestion(
  input: CreateQuestionInput,
  options: GenerateOptions = {},
): Question {
  const { operation, firstOperand, secondOperand, difficulty } = input
  const correctAnswer = computeAnswer(operation, firstOperand, secondOperand)
  const choices = buildChoices(
    operation,
    firstOperand,
    secondOperand,
    correctAnswer,
    {
      random: options.random,
      allowNegative: negativesAllowed(
        operation,
        difficulty,
        options.allowNegativeSubtraction,
      ),
    },
  )
  return {
    id: createId('question'),
    operation,
    firstOperand,
    secondOperand,
    displayText: formatQuestionText(operation, firstOperand, secondOperand),
    correctAnswer,
    choices,
    difficulty,
    source: input.source ?? 'regular',
    ...(input.mistakePatternId && { mistakePatternId: input.mistakePatternId }),
  }
}

/** Generates a random, validated question for one operation and level. */
export function generateQuestion(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  options: GenerateOptions = {},
): Question {
  const random = options.random ?? Math.random
  const allowNegative = options.allowNegativeSubtraction ?? false
  const generateOperands = operandGenerators[operation]
  if (!generateOperands) {
    throw new QuestionGenerationError(`Unsupported operation: ${operation}`)
  }

  let lastErrors: string[] = []
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const [firstOperand, secondOperand] = generateOperands(
        difficulty,
        random,
        allowNegative,
      )
      const question = createQuestion(
        { operation, firstOperand, secondOperand, difficulty },
        options,
      )
      lastErrors = validateQuestion(question, {
        allowNegativeSubtraction: allowNegative,
      })
      if (lastErrors.length === 0) return question
    } catch (error) {
      lastErrors = [String(error)]
    }
  }
  logDevError(
    `Using a fallback ${operation} question for level ${difficulty} after ${MAX_GENERATION_ATTEMPTS} failed attempts: ${lastErrors.join('; ')}`,
  )
  const [firstOperand, secondOperand] = FALLBACK_OPERANDS[operation][difficulty]
  // The caller's random source may be what kept failing, so do not reuse it.
  const fallback = createQuestion(
    { operation, firstOperand, secondOperand, difficulty },
    { allowNegativeSubtraction: options.allowNegativeSubtraction },
  )
  if (validateQuestion(fallback).length === 0) return fallback
  throw new QuestionGenerationError(
    `Could not generate a ${operation} question for level ${difficulty}: ${lastErrors.join('; ')}`,
  )
}

/**
 * Generates a question for one of the chosen operations, picked at random.
 * If one operation keeps failing, the others are tried before giving up.
 */
export function generateQuestionForOperations(
  operations: readonly MathOperation[],
  difficulty: DifficultyLevel,
  options: GenerateOptions = {},
): Question {
  if (operations.length === 0) {
    throw new QuestionGenerationError('No operations were selected')
  }
  const random = options.random ?? Math.random
  const first = randomItem(operations, random)
  const order = [first, ...operations.filter((op) => op !== first)]
  let lastError: unknown
  for (const operation of order) {
    try {
      return generateQuestion(operation, difficulty, options)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}
