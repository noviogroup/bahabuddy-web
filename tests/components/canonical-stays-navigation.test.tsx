import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import Sidebar from '@/components/dashboard/Sidebar'
import HeroSearchPanel from '@/components/home/HeroSearchPanel'

let mockPathname = '/dashboard'

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: navigationMocks.push,
  }),
}))

vi.mock('@/components/SignOutButton', () => ({
  default: () => <button type="button">Sign out</button>,
}))

describe('canonical stays navigation', () => {
  beforeEach(() => {
    mockPathname = '/dashboard'
    navigationMocks.push.mockClear()
  })

  test('dashboard sidebar uses canonical stays route instead of legacy hotels', () => {
    render(<Sidebar userEmail="traveler@example.com" variant="expanded" />)

    const staysLink = screen.getByRole('link', { name: 'Stays' })
    expect(staysLink).toHaveAttribute('href', '/stays')
    expect(screen.queryByRole('link', { name: 'Stay' })).not.toBeInTheDocument()

    const thingsToDoLink = screen.getByRole('link', { name: 'Things to Do' })
    expect(thingsToDoLink).toHaveAttribute('href', '/explore/places?search=things+to+do')
    expect(thingsToDoLink.getAttribute('href')).not.toContain('/dashboard/chat')
  })

  test('legacy hotel URLs still light up the canonical sidebar item', () => {
    mockPathname = '/hotels/lp6558fbc7'

    render(<Sidebar userEmail="traveler@example.com" variant="expanded" />)

    expect(screen.getByRole('link', { name: 'Stays' })).toHaveAttribute('aria-current', 'page')
  })

  test('dashboard plan search creates a trip instead of starting chat', () => {
    render(<HeroSearchPanel />)

    fireEvent.change(screen.getByLabelText('Trip idea'), {
      target: { value: 'quiet Exuma honeymoon with beach days' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create trip' }))

    expect(navigationMocks.push).toHaveBeenCalledTimes(1)
    const destination = navigationMocks.push.mock.calls[0][0] as string
    expect(destination).toBe(
      '/dashboard/trips/new?source=dashboard_search&seed=quiet+Exuma+honeymoon+with+beach+days',
    )
    expect(destination).not.toContain('/dashboard/chat')
    expect(screen.queryByRole('button', { name: 'Start with Buddy' })).not.toBeInTheDocument()
  })

  test('dashboard stays search submits to canonical stays route', () => {
    render(<HeroSearchPanel />)

    fireEvent.click(screen.getByRole('tab', { name: 'Stays' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Where to menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: 'Exuma' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find stays' }))

    expect(navigationMocks.push).toHaveBeenCalledTimes(1)
    const destination = navigationMocks.push.mock.calls[0][0] as string
    expect(destination).toMatch(/^\/stays\?/)
    expect(destination).toContain('island=exuma')
    expect(destination).not.toContain('/hotels')
  })

  test('dashboard flight search uses airport autocomplete and custom listboxes', () => {
    render(<HeroSearchPanel />)

    fireEvent.click(screen.getByRole('tab', { name: 'Flights' }))

    const from = screen.getByRole('combobox', { name: 'From' })
    expect(document.querySelector('#hero-origin-options')).toBeNull()
    fireEvent.change(from, { target: { value: 'west palm' } })
    expect(screen.getByText('Palm Beach International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Palm Beach International Airport/i }))

    const to = screen.getByRole('combobox', { name: 'To' })
    fireEvent.change(to, { target: { value: 'exuma' } })
    expect(screen.getByText('Exuma International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Exuma International Airport/i }))

    fireEvent.click(screen.getByRole('button', { name: 'Open Cabin menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: 'Business' }))

    fireEvent.click(screen.getByRole('button', { name: 'Find flights' }))

    expect(navigationMocks.push).toHaveBeenCalledTimes(1)
    const destination = navigationMocks.push.mock.calls[0][0] as string
    expect(destination).toMatch(/^\/flights\?/)
    expect(destination).toContain('origin=West+Palm+Beach')
    expect(destination).toContain('destination=EXU')
    expect(destination).toContain('cabin=business')
  })

  test('dashboard things-to-do search opens Explore places instead of chat', () => {
    render(<HeroSearchPanel />)

    fireEvent.click(screen.getByRole('tab', { name: 'Things to Do' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Where menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: 'Exuma' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find activities' }))

    expect(navigationMocks.push).toHaveBeenCalledTimes(1)
    const destination = navigationMocks.push.mock.calls[0][0] as string
    expect(destination).toMatch(/^\/explore\/places\?/)
    expect(destination).toContain('island=exuma')
    expect(destination).toContain('search=things+to+do')
    expect(destination).not.toContain('/dashboard/chat')
  })
})
