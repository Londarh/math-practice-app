/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Color tokens as defined in src/index.css, e.g. { primary: '#1f6fd1' }. */
// Vitest runs from the project root.
const css = readFileSync('src/index.css', 'utf8')
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [
    m[1],
    m[2],
  ]),
)

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

// [text or UI color, background, minimum WCAG AA ratio]
const pairs: [string, string, number][] = [
  // Body and muted text on page and card backgrounds.
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['text', 'sky', 4.5],
  ['text-muted', 'bg', 4.5],
  ['text-muted', 'surface', 4.5],
  ['text-muted', 'sky', 4.5],
  // White button labels on colored buttons.
  ['on-color', 'primary', 4.5],
  ['on-color', 'success', 4.5],
  ['on-color', 'purple', 4.5],
  // Links, the current page, warnings and "Mastered!" text.
  ['primary-dark', 'surface', 4.5],
  ['primary-dark', 'bg', 4.5],
  ['coral-dark', 'surface', 4.5],
  ['coral-dark', 'bg', 4.5],
  ['success-dark', 'surface', 4.5],
  // Non-text UI: focus ring and selected borders need 3:1.
  ['focus', 'surface', 3],
  ['focus', 'bg', 3],
  ['primary', 'surface', 3],
  ['primary', 'bg', 3],
]

describe('color contrast', () => {
  it.each(pairs)('%s on %s meets %d:1', (fg, bg, minimum) => {
    expect(tokens[fg], `missing token ${fg}`).toBeDefined()
    expect(tokens[bg], `missing token ${bg}`).toBeDefined()
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(
      minimum,
    )
  })

  it('computes known ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1)
  })
})
