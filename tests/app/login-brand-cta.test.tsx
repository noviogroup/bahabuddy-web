import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import LoginPage from '@/app/login/page'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  track: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      signInWithOtp: mocks.signInWithOtp,
    },
  }),
}))

vi.mock('@/lib/analytics', () => ({
  track: mocks.track,
}))

describe('LoginPage brand CTAs', () => {
  test('uses Baha Buddy blue primary auth actions instead of dark generic buttons', () => {
    const { container } = render(<LoginPage />)

    expect(screen.getByRole('button', { name: 'Password' })).toHaveClass('bg-brand-600')
    const signInSubmit = screen.getAllByRole('button', { name: 'Sign in' }).find((button) => (
      button.getAttribute('type') === 'submit'
    ))
    expect(signInSubmit).toHaveClass('bg-brand-600')
    expect(container.querySelector('.bg-gold-400')).toBeInTheDocument()
    expect(container.innerHTML).not.toMatch(/bg-night|hover:bg-gray-900/)

    fireEvent.click(screen.getByRole('button', { name: 'Magic link' }))

    expect(screen.getByRole('button', { name: 'Magic link' })).toHaveClass('bg-brand-600')
    expect(screen.getByRole('button', { name: 'Send magic link' })).toHaveClass('bg-brand-600')
    expect(container.innerHTML).not.toMatch(/bg-night|hover:bg-gray-900/)
  })
})
