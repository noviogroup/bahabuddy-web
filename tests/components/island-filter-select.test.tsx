import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import IslandFilterSelect from '@/components/destinations/IslandFilterSelect'

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigationMocks.push,
  }),
}))

describe('IslandFilterSelect', () => {
  beforeEach(() => {
    navigationMocks.push.mockClear()
  })

  test('uses the custom marketplace menu and preserves destination filters', () => {
    const { container } = render(
      <IslandFilterSelect
        islands={['Abaco', 'Exuma', 'Nassau']}
        activeIsland=""
        activeCategory="Beach"
      />,
    )

    expect(container.querySelector('select:not(.sr-only)')).toBeNull()
    expect(screen.getByLabelText('Island')).toHaveValue('')

    fireEvent.click(screen.getByRole('button', { name: 'Open Island menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: 'Exuma' }))

    expect(navigationMocks.push).toHaveBeenCalledWith('/destinations?category=Beach&island=Exuma')
  })

  test('clearing the island keeps an active category filter', () => {
    render(
      <IslandFilterSelect
        islands={['Abaco', 'Exuma', 'Nassau']}
        activeIsland="Exuma"
        activeCategory="Nature"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Island menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: 'All islands' }))

    expect(navigationMocks.push).toHaveBeenCalledWith('/destinations?category=Nature')
  })
})
