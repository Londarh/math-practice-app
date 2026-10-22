import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function renderDialog(open = true) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const result = render(
    <>
      <button>Outside</button>
      <ConfirmDialog
        open={open}
        title="Reset statistics?"
        message="Are you sure you want to erase all practice history and statistics?"
        confirmLabel="Yes, erase it"
        cancelLabel="No, keep it"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </>,
  )
  return { user: userEvent.setup(), onConfirm, onCancel, ...result }
}

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    renderDialog(false)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('is a labelled modal dialog with the question as its description', () => {
    renderDialog()

    const dialog = screen.getByRole('alertdialog', {
      name: 'Reset statistics?',
    })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription(
      'Are you sure you want to erase all practice history and statistics?',
    )
  })

  it('focuses the safe choice first, so Enter does not confirm by accident', async () => {
    const { user, onConfirm, onCancel } = renderDialog()

    expect(screen.getByRole('button', { name: 'No, keep it' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirms only when the confirm button is pressed', async () => {
    const { user, onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Yes, erase it' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('closes with Escape', async () => {
    const { user, onCancel } = renderDialog()

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('keeps Tab inside the dialog', async () => {
    const { user } = renderDialog()
    const keep = screen.getByRole('button', { name: 'No, keep it' })
    const erase = screen.getByRole('button', { name: 'Yes, erase it' })

    await user.tab()
    expect(erase).toHaveFocus()
    await user.tab()
    expect(keep).toHaveFocus()
    await user.tab({ shift: true })
    expect(erase).toHaveFocus()
  })

  it('gives focus back to where it was when it closes', () => {
    const { rerender } = renderDialog(false)
    const outside = screen.getByRole('button', { name: 'Outside' })
    outside.focus()
    const props = {
      title: 'Reset statistics?',
      message: 'Sure?',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      onConfirm: () => {},
      onCancel: () => {},
    }

    rerender(
      <>
        <button>Outside</button>
        <ConfirmDialog open {...props} />
      </>,
    )
    expect(screen.getByRole('button', { name: 'No' })).toHaveFocus()
    rerender(
      <>
        <button>Outside</button>
        <ConfirmDialog open={false} {...props} />
      </>,
    )

    expect(outside).toHaveFocus()
  })
})
