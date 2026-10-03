import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import BahaDatePicker from '@/components/ui/date/BahaDatePicker'
import BahaDateRangePicker from '@/components/ui/date/BahaDateRangePicker'
import SearchSummaryPanel from '@/components/marketplace/SearchSummaryPanel'

describe('search calendar keyboard recovery', () => {
  test.each(['single', 'range'])('%s calendar closes before its parent search panel', (mode) => {
    render(
      <SearchSummaryPanel summary="Your trip" detail="Choose dates">
        {mode === 'single' ? (
          <BahaDatePicker value="" onChange={vi.fn()} ariaLabel="Departure" />
        ) : (
          <BahaDateRangePicker start="" end="" onChange={vi.fn()} ariaLabel="Stay dates" />
        )}
      </SearchSummaryPanel>,
    )

    const trigger = screen.getByRole('button', { name: mode === 'single' ? 'Departure' : 'Stay dates' })
    fireEvent.click(trigger)
    const calendarButton = within(screen.getByRole('dialog')).getAllByRole('button')[0]
    calendarButton.focus()
    fireEvent.keyDown(calendarButton, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Close search' })).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Edit search' })).toHaveFocus()
  })
})
