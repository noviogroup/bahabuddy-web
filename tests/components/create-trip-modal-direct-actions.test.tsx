import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import CreateTripModal from '@/components/trip/CreateTripModal'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createTripAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/app/actions/create-trip', () => ({
  createTripAction: mocks.createTripAction,
}))

describe('CreateTripModal direct trip creation', () => {
  beforeEach(() => {
    mocks.push.mockClear()
    mocks.createTripAction.mockReset()
  })

  test('opens the canonical trip detail page after creation instead of chat', async () => {
    const onClose = vi.fn()
    mocks.createTripAction.mockResolvedValue({
      ok: true,
      tripId: 'trip-123',
      seedQuery: 'unused chat seed',
    })

    render(<CreateTripModal open onClose={onClose} />)

    expect(screen.getByRole('button', { name: 'Flexible' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('button', { name: 'Create trip' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('button', { name: 'Create trip' })).toHaveTextContent('Create trip')
    expect(screen.getByRole('button', { name: 'Create trip' }).querySelector('.bg-gold-400')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Nassau/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Create trip' }))

    await waitFor(() => expect(mocks.createTripAction).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/trip/trip-123')
    expect(mocks.push).not.toHaveBeenCalledWith(expect.stringContaining('/dashboard/chat'))
    expect(screen.queryByText('Buddy will take it from here.')).not.toBeInTheDocument()
  })
})
