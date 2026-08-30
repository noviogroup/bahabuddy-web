import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'vitest'
import MarketingHeroSearch, { marketingHeroTripHref } from '@/components/marketing/MarketingHeroSearch'
import {
  TRAVEL_ORIGIN_EVENT,
  TRAVEL_ORIGIN_STORAGE_KEY,
  type TravelOriginPreference,
} from '@/lib/travel-origin'

describe('MarketingHeroSearch', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  test('uses custom marketplace listboxes for public stays search dropdowns', () => {
    render(<MarketingHeroSearch />)

    fireEvent.click(screen.getByRole('tab', { name: 'Stays' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Where to menu' }))

    const listbox = screen.getByRole('listbox')
    fireEvent.mouseDown(within(listbox).getByRole('option', { name: 'Exuma' }))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Where to menu' })).toHaveTextContent('Exuma')
    expect(screen.getByLabelText('Where to')).toHaveValue('exuma')
    expect(document.querySelector('select#m-stays-island')).toHaveClass('sr-only')
    expect(screen.getByRole('button', { name: 'Open Where to menu' })).toHaveClass('bg-white')
  })

  test('keeps flight destination autocomplete and traveler controls modern while preserving form values', () => {
    render(<MarketingHeroSearch />)

    fireEvent.click(screen.getByRole('tab', { name: 'Flights' }))
    const to = screen.getByRole('combobox', { name: 'To' })
    fireEvent.change(to, { target: { value: 'exuma' } })
    expect(screen.getByText('Exuma International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Exuma International Airport/i }))

    fireEvent.click(screen.getByRole('button', { name: 'Open Travelers menu' }))
    fireEvent.mouseDown(within(screen.getByRole('listbox')).getByRole('option', { name: '3 travelers' }))

    expect(to).toHaveValue('Exuma (EXU)')
    expect(screen.getByRole('button', { name: 'Open Travelers menu' })).toHaveTextContent('3 travelers')
    expect(document.querySelector('input[type="hidden"][name="m-flight-to"]')).toHaveValue('EXU')
    expect(screen.getByLabelText('Travelers')).toHaveValue('3')
    expect(document.querySelector('select#m-flight-to')).toBeNull()
    expect(document.querySelector('select#m-flight-travelers')).toHaveClass('sr-only')
  })

  test('lets homepage visitors search their departure airport without knowing the code', () => {
    render(<MarketingHeroSearch />)

    fireEvent.click(screen.getByRole('tab', { name: 'Flights' }))

    const from = screen.getByRole('combobox', { name: 'From' })
    expect(from).toHaveClass('bg-white')
    expect(document.querySelector('#m-flight-from-list')).toBeNull()

    fireEvent.change(from, { target: { value: 'west palm' } })
    expect(screen.getByText('Palm Beach International Airport')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('option', { name: /Palm Beach International Airport/i }))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(from).toHaveValue('West Palm Beach (PBI)')
    expect(document.querySelector('input[type="hidden"][name="m-flight-from"]')).toHaveValue('West Palm Beach')
  })

  test('uses royal blue primary actions without decorative dots', () => {
    const { container } = render(<MarketingHeroSearch />)

    const button = screen.getByRole('button', { name: /Build My Trip/i })

    expect(button).toHaveClass('bg-brand-600')
    expect(button.querySelector('.bg-gold-400')).toBeNull()
    expect(container.querySelector('[role="tab"][aria-selected="true"] .text-gold-500')).toBeTruthy()
  })

  test('uses rounded white hero search panel surfaces', () => {
    render(<MarketingHeroSearch />)

    const tablist = screen.getByRole('tablist', { name: 'Search category' })
    const panel = tablist.parentElement
    const formArea = tablist.nextElementSibling

    expect(panel).toHaveClass('rounded-[29px]')
    expect(panel).toHaveClass('border-white')
    expect(panel).toHaveClass('bg-white')
    expect(tablist).toHaveClass('rounded-t-[29px]')
    expect(tablist).toHaveClass('grid-cols-2')
    expect(tablist).toHaveClass('min-[360px]:grid-cols-3')
    expect(tablist).toHaveClass('sm:flex')
    expect(formArea).toHaveClass('rounded-b-[29px]')
    expect(formArea).toHaveClass('bg-white')
    expect(formArea).not.toHaveClass('bg-offwhite')
  })

  test('routes public trip planning to direct trip creation instead of chat', () => {
    const href = marketingHeroTripHref('  Family beach trip in Exuma  ')
    const url = new URL(href, 'http://localhost:3000')

    expect(url.pathname).toBe('/dashboard/trips/new')
    expect(url.searchParams.get('source')).toBe('marketing_hero')
    expect(url.searchParams.get('returnTo')).toBe('/')
    expect(url.searchParams.get('seed')).toBe('Family beach trip in Exuma')
    expect(href).not.toContain('/dashboard/chat')

    render(<MarketingHeroSearch />)

    expect(screen.getByRole('form', { name: 'Create a trip with Baha Buddy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tell Baha Buddy what kind of Bahamas trip you want')).toBeInTheDocument()
    const planForm = screen.getByRole('form', { name: 'Create a trip with Baha Buddy' })
    expect(planForm.firstElementChild).toHaveClass('flex-col')
    expect(planForm.firstElementChild).toHaveClass('min-[480px]:flex-row')
    const buildButton = screen.getByRole('button', { name: /Build My Trip/i })
    expect(buildButton).toHaveClass('bg-brand-600')
    expect(buildButton).toHaveClass('min-h-12')
    expect(buildButton).toHaveClass('w-full')
    expect(buildButton).toHaveClass('min-[480px]:w-auto')
  })

  test('uses saved travel origin as the homepage flight search default', async () => {
    const preference: TravelOriginPreference = {
      origin: 'Atlanta',
      savedAt: '2026-06-20T00:00:00.000Z',
    }
    window.localStorage.setItem(TRAVEL_ORIGIN_STORAGE_KEY, JSON.stringify(preference))

    render(<MarketingHeroSearch />)

    fireEvent.click(screen.getByRole('tab', { name: 'Flights' }))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'From' })).toHaveValue('Atlanta (ATL)')
    })
    expect(document.querySelector('input[type="hidden"][name="m-flight-from"]')).toHaveValue('Atlanta')
  })

  test('updates homepage flight search when the public origin prompt is saved', async () => {
    render(<MarketingHeroSearch />)

    fireEvent.click(screen.getByRole('tab', { name: 'Flights' }))
    expect(screen.getByRole('combobox', { name: 'From' })).toHaveValue('Miami (MIA)')

    act(() => {
      window.dispatchEvent(new CustomEvent(TRAVEL_ORIGIN_EVENT, {
        detail: { origin: 'Toronto' },
      }))
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'From' })).toHaveValue('Toronto (YYZ)')
    })
    expect(document.querySelector('input[type="hidden"][name="m-flight-from"]')).toHaveValue('Toronto')
  })
})
