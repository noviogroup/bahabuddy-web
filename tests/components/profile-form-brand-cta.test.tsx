import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import ProfileForm from '@/components/profile/ProfileForm'

vi.mock('@/app/(dashboard)/profile/actions', () => ({
  updateProfile: vi.fn(async () => ({ success: true })),
}))

const initialProfile = {
  display_name: 'Valdez',
  city: 'Nassau',
  country: 'Bahamas',
  party_type: 'solo',
  party_size: 1,
  children_count: 0,
  interest_tags: ['beaches'],
}

describe('ProfileForm brand CTA', () => {
  test('uses the brand primary save action and gold accent', () => {
    const { container } = render(<ProfileForm initial={initialProfile} />)

    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Valdez Williams' },
    })

    const save = screen.getByRole('button', { name: /Save changes/i })
    expect(save).toHaveClass('bg-brand-600')
    expect(save).toHaveClass('hover:bg-brand-700')
    expect(container.querySelector('.bg-gold-400')).toBeInTheDocument()
    expect(container.innerHTML).not.toMatch(/bg-night|hover:bg-gray-900/)
  })
})
