import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, test } from 'vitest'
import BuddyAvatar from '@/components/ui/BuddyAvatar'
import { useDialogFocus } from '@/components/ui/useDialogFocus'
import { TravelSearchField, TravelSearchSelect } from '@/components/marketplace/TravelSearchFields'

function flushFrames() {
  return act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
}

function DialogHarness() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDialogFocus({ open, containerRef: ref, trapFocus: true, onClose: () => setOpen(false) })
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Open dialog</button>
      {open && (
        <div ref={ref} role="dialog" aria-modal="true" aria-label="Test dialog">
          <button type="button">First</button>
          <button type="button" onClick={() => setOpen(false)}>Last</button>
        </div>
      )}
    </div>
  )
}

describe('accessibility primitives', () => {
  test('BuddyAvatar is decorative by default and named only when labelled', () => {
    const { container, rerender } = render(<BuddyAvatar state="thinking" />)
    expect(screen.queryByRole('img', { name: /Buddy/ })).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.innerHTML).toContain('motion-reduce:animate-none')

    rerender(<BuddyAvatar state="idle" label="Buddy" />)
    expect(screen.getByRole('img', { name: 'Buddy' })).toBeInTheDocument()
  })

  test('useDialogFocus moves focus in, traps Tab, closes on Escape and restores focus', async () => {
    render(<DialogHarness />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })
    opener.focus()
    fireEvent.click(opener)
    await flushFrames()

    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })
    expect(first).toHaveFocus()

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  test('TravelSearchSelect names the trigger with label and value and exposes the active option', () => {
    render(
      <TravelSearchField label="Cabin">
        <TravelSearchSelect defaultValue="economy">
          <option value="economy">Economy</option>
          <option value="business">Business</option>
        </TravelSearchSelect>
      </TravelSearchField>,
    )

    const trigger = screen.getByRole('button', { name: 'Cabin: Economy' })
    expect(trigger).not.toHaveAttribute('aria-activedescendant')
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const active = trigger.getAttribute('aria-activedescendant')
    expect(active).toBeTruthy()
    expect(document.getElementById(active as string)).toHaveTextContent('Business')
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'Cabin: Business' })).toBeInTheDocument()
  })
})
