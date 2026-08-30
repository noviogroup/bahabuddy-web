import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import BuildMyCruiseDayPage from '@/app/build-my-cruise-day/page'
import ListYourPropertyPage from '@/app/list-your-property/page'
import PartnersPage from '@/app/partners/page'
import TourismBoardPartnershipsPage from '@/app/tourism-board-partnerships/page'
import { ConciergeDetailsClientForm } from '@/components/concierge/ConciergeDetailsClientForm'
import PartnerApplicationForm from '@/components/revenue/PartnerApplicationForm'
import TravelDocumentLeadForm from '@/components/revenue/TravelDocumentLeadForm'

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
}))

describe('public lead and intake forms', () => {
  test('partner application uses marketplace fields and preserves default action', () => {
    const { container } = render(<PartnerApplicationForm />)
    const form = container.querySelector('form')

    expect(form).toHaveAttribute('action', '/partners?submitted=partner')
    expect(screen.getByLabelText('Business name')).toBeRequired()
    expect(screen.getByLabelText('Category')).toBeRequired()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Current booking method')).toHaveAttribute(
      'placeholder',
      'Website, phone, WhatsApp, FareHarbor, direct email',
    )
    expect(screen.getByLabelText('Short description')).toBeInTheDocument()
  })

  test('list-your-property renders property-specific application flow', () => {
    const { container } = render(<ListYourPropertyPage searchParams={{ submitted: 'property' }} />)
    const form = container.querySelector('form[name="baha-buddy-partner-application"]')

    expect(screen.getByText('Property application received. The Baha Buddy team can now review the property for marketplace placement.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Submit your property for review' })).toBeInTheDocument()
    expect(form).toHaveAttribute('action', '/list-your-property?submitted=property')
    expect(screen.getByLabelText('Business name')).toBeRequired()
  })

  test('partners page uses compact utility layout with neutral intake styling', () => {
    const { container } = render(<PartnersPage searchParams={{ submitted: 'partner' }} />)
    const form = container.querySelector('form[name="baha-buddy-partner-application"]')

    expect(screen.getByRole('heading', { name: 'Partner with Baha Buddy' })).toBeInTheDocument()
    const utilityNav = screen.getByRole('navigation', { name: 'Company and legal pages' })
    expect(utilityNav).toBeInTheDocument()
    expect(within(utilityNav).getByRole('link', { name: 'Partner with us' })).toHaveAttribute('href', '/partners')
    expect(within(utilityNav).getByRole('link', { name: 'Tourism board partnerships' })).toHaveAttribute(
      'href',
      '/tourism-board-partnerships',
    )
    expect(screen.getByText('Application received')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Founding partner opportunity' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Partner intake' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'tourism board partnership path' })).toHaveAttribute(
      'href',
      '/tourism-board-partnerships',
    )
    expect(form).toHaveAttribute('action', '/partners?submitted=partner')
    expect(form).toHaveClass('border-gray-200')
    expect(container.innerHTML).not.toMatch(/bg-gradient-brand|border-sand|bg-sand|ring-sand/)
  })

  test('tourism board page renders destination partnership intake flow', () => {
    const { container } = render(<TourismBoardPartnershipsPage searchParams={{ submitted: 'tourism-board' }} />)
    const form = container.querySelector('form[name="baha-buddy-partner-application"]')
    const utilityNav = screen.getByRole('navigation', { name: 'Company and legal pages' })

    expect(screen.getByRole('heading', { name: 'Tourism board partnerships' })).toBeInTheDocument()
    expect(within(utilityNav).getByRole('link', { name: 'Tourism board partnerships' })).toHaveClass('bg-gray-100')
    expect(screen.getByText('Partnership inquiry received')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Partnership models' })).toBeInTheDocument()
    expect(screen.getByText('Visitor-intent reporting')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Submit a destination partnership inquiry' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'partner application' })).toHaveAttribute('href', '/partners')
    expect(form).toHaveAttribute('action', '/tourism-board-partnerships?submitted=tourism-board')
    expect(form).toHaveClass('border-gray-200')
  })

  test('travel-document lead form exposes accessible marketplace fields', () => {
    render(<TravelDocumentLeadForm />)

    expect(screen.getByLabelText('Name')).toBeRequired()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Nationality')).toBeInTheDocument()
    expect(screen.getByLabelText('Lead type')).toHaveValue('Bahamas visitor visa support')
    expect(screen.getByLabelText('Notes')).toBeInTheDocument()
  })

  test('concierge detail client form preserves existing order values', () => {
    render(
      <ConciergeDetailsClientForm
        order={{
          id: 'order-1',
          traveler_name: 'Valdez Williams',
          traveler_email: 'valdez@example.com',
          travel_dates: 'July 3-8',
          party_size: '2 adults',
          budget_range: '$2,000-$3,000',
          destination_interests: 'Nassau, Exuma',
          notes: 'Food, beaches, and easy transfers',
        }}
      />,
    )

    expect(screen.getByLabelText('Name')).toHaveValue('Valdez Williams')
    expect(screen.getByLabelText('Email')).toHaveValue('valdez@example.com')
    expect(screen.getByLabelText('Travel dates')).toHaveValue('July 3-8')
    expect(screen.getByLabelText('Group size')).toHaveValue('2 adults')
    expect(screen.getByLabelText('Preferred islands')).toHaveValue('Nassau, Exuma')
    expect(screen.getByLabelText('Trip style and notes')).toHaveValue('Food, beaches, and easy transfers')
    expect(screen.getByRole('button', { name: 'Submit trip details' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('button', { name: 'Submit trip details' }).querySelector('.bg-gold-400')).not.toBeInTheDocument()
  })

  test('cruise-day intake uses marketplace fields and preserves itinerary context', async () => {
    const page = await BuildMyCruiseDayPage({
      searchParams: Promise.resolve({ itinerary: 'nassau-family-day' }),
    })
    const { container } = render(page)

    expect(screen.getByLabelText('Name')).toBeRequired()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Ship name')).toBeInTheDocument()
    expect(screen.getByLabelText('Visit date')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Arrival time')).toHaveAttribute('type', 'time')
    expect(screen.getByLabelText('Departure time')).toHaveAttribute('type', 'time')
    expect(screen.getByLabelText('What kind of day do you want?')).toHaveAttribute(
      'placeholder',
      'Beach, food, culture, shopping, family-friendly, low walking, premium, budget',
    )
    expect(container.querySelector('input[name="selected_itinerary"]')).toHaveAttribute('value', 'nassau-family-day')
  })
})
