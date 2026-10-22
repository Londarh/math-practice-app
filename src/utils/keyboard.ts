const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'radio',
  'range',
  'reset',
  'submit',
  'color',
  'file',
  'image',
])

/** True when key presses should go to a text field, not to app shortcuts. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLSelectElement) return true
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)
}
