import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import TripTabView from '@/components/TripTabView'

function renderTabs() {
  return render(
    <TripTabView
      timelineContent={<p>Timeline panel</p>}
      mapContent={<p>Map panel</p>}
      budgetContent={<p>Budget panel</p>}
      hasMapData
    />,
  )
}

describe('TripTabView hash routing', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  test('opens the budget tab from a hash link', async () => {
    window.history.replaceState(null, '', '/trip/trip-123#budget')

    renderTabs()

    await waitFor(() => {
      expect(screen.getByText('Budget panel')).toBeInTheDocument()
    })
    expect(screen.queryByText('Timeline panel')).not.toBeInTheDocument()
  })
})
