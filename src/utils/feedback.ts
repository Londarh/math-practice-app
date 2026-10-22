import { randomItem, type RandomSource } from './math'

/** Shown when the chosen answer matches the correct one. */
export const MATCH_MESSAGES = [
  'Great job! Your answer matches.',
  'Nice work! You got it!',
  'Super thinking! That is right.',
  'You did it! Keep it up!',
  'Awesome! Your brain is getting stronger.',
]

/** Shown when it does not match: supportive, never shaming (spec 13.4). */
export const SUPPORT_MESSAGES = [
  'Nice try! Every mistake helps you learn.',
  'Good effort! Now you know this one.',
  "That's okay! Practice makes progress.",
  'Almost! You will get it next time.',
  "Keep going! You're learning something new.",
]

export interface Feedback {
  icon: string
  message: string
}

/** One short message for the back of the card, picked at random. */
export function pickFeedback(
  matched: boolean,
  random: RandomSource = Math.random,
): Feedback {
  return matched
    ? { icon: '🎉', message: randomItem(MATCH_MESSAGES, random) }
    : { icon: '🌱', message: randomItem(SUPPORT_MESSAGES, random) }
}
