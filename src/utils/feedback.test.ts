import { describe, expect, it } from 'vitest'
import { MATCH_MESSAGES, pickFeedback, SUPPORT_MESSAGES } from './feedback'

describe('pickFeedback', () => {
  it('uses positive messages for a matching answer', () => {
    const { icon, message } = pickFeedback(true)

    expect(icon).toBe('🎉')
    expect(MATCH_MESSAGES).toContain(message)
  })

  it('uses supportive messages otherwise', () => {
    const { icon, message } = pickFeedback(false)

    expect(icon).toBe('🌱')
    expect(SUPPORT_MESSAGES).toContain(message)
  })

  it('varies the message', () => {
    const seen = new Set(
      [0, 0.25, 0.5, 0.75, 0.99].map(
        (r) => pickFeedback(false, () => r).message,
      ),
    )

    expect(seen.size).toBe(SUPPORT_MESSAGES.length)
  })

  it.each([...MATCH_MESSAGES, ...SUPPORT_MESSAGES])(
    '"%s" is short and never shaming',
    (message) => {
      expect(message.length).toBeLessThanOrEqual(45)
      expect(message).not.toMatch(
        /\b(wrong|bad|fail|failed|stupid|dumb|silly|lazy|careless|should have|easy)\b/i,
      )
    },
  )
})
