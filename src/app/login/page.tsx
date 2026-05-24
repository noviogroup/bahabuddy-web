'use client'

/**
 * /login — combined Sign In / Sign Up surface.
 *
 * One page, top-level toggle: [Sign In] [Sign Up].
 * Each mode supports password OR magic link (passwordless).
 *
 * Sign Up specifics:
 *   - Optional display_name captured at signup → stored in
 *     user_metadata so onboarding can pre-fill it (Screen 2).
 *   - After password signup: Supabase sends a confirmation email;
 *     we show a "check your email" success state.
 *   - After magic-link signup: same flow as signin magic link, but
 *     the post-auth redirect target is /onboarding instead of /dashboard.
 *
 * Redirect logic:
 *   - Sign in respects ?redirect= (from middleware), default /dashboard.
 *   - Sign up always goes to /onboarding (so the user gets the full
 *     6-screen flow before landing on the dashboard).
 *   - ?mode=signup pre-selects the Sign Up tab so we can deep-link
 *     marketing CTAs straight to it.
 */

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { BahaLogo } from '@/components/ui'
import { track } from '@/lib/analytics'

type Mode = 'signin' | 'signup'
type Method = 'password' | 'magic'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode: Mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const redirectParam = searchParams.get('redirect') ?? '/dashboard'

  const [mode, setMode] = useState<Mode>(initialMode)
  const [method, setMethod] = useState<Method>('password')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = createClient()

  // Sign up always sends the user to /onboarding first. Sign in goes
  // wherever the middleware originally wanted them (default /dashboard).
  const postAuthPath = mode === 'signup' ? '/onboarding' : redirectParam

  function switchMode(next: Mode) {
    setMode(next)
    setMessage(null)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signup') {
        if (password.length < 8) {
          setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
          return
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthPath)}`,
            data: displayName.trim() ? { display_name: displayName.trim() } : undefined,
          },
        })
        if (error) {
          setMessage({ type: 'error', text: error.message })
          return
        }
        track('signup_completed', { method: 'password' })
        setMessage({
          type: 'success',
          text: "Account created. Check your email for a confirmation link to finish signing up.",
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage({ type: 'error', text: error.message })
          return
        }
        track('login_completed', { method: 'password' })
        router.push(postAuthPath)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) {
      setMessage({ type: 'error', text: 'Enter your email first.' })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(postAuthPath)}`,
          // Display name only applies to brand-new accounts. Supabase
          // ignores it for already-existing users.
          data:
            mode === 'signup' && displayName.trim()
              ? { display_name: displayName.trim() }
              : undefined,
        },
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
        return
      }
      track(mode === 'signup' ? 'signup_completed' : 'login_completed', { method: 'magic_link' })
      setMessage({
        type: 'success',
        text:
          mode === 'signup'
            ? "We've sent a magic link to your email. Open it to finish signing up."
            : 'Check your email for the magic link!',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
      {/* Sign In / Sign Up toggle — primary mode switch */}
      <div className="flex rounded-full bg-gray-100 p-1 mb-5">
        <button
          type="button"
          onClick={() => switchMode('signin')}
          className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            mode === 'signin' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          aria-pressed={mode === 'signin'}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchMode('signup')}
          className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            mode === 'signup' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          aria-pressed={mode === 'signup'}
        >
          Sign up
        </button>
      </div>

      {/* Method sub-toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-5 text-xs">
        <button
          type="button"
          onClick={() => { setMethod('password'); setMessage(null) }}
          className={`flex-1 py-2 font-medium transition-colors ${
            method === 'password' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
          aria-pressed={method === 'password'}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => { setMethod('magic'); setMessage(null) }}
          className={`flex-1 py-2 font-medium transition-colors ${
            method === 'magic' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
          aria-pressed={method === 'magic'}
        >
          Magic link
        </button>
      </div>

      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`rounded-lg px-4 py-3 mb-4 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {method === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium text-gray-700 mb-1">
                What should Buddy call you? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="auth-name"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                maxLength={60}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password {mode === 'signup' && <span className="text-gray-400 font-normal">(min 8 characters)</span>}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={mode === 'signup' ? 8 : undefined}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
              : (mode === 'signup' ? 'Create account' : 'Sign in')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name-magic" className="block text-sm font-medium text-gray-700 mb-1">
                What should Buddy call you? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="auth-name-magic"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                maxLength={60}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email-magic" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="auth-email-magic"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading
              ? 'Sending…'
              : (mode === 'signup' ? 'Send sign-up link' : 'Send magic link')}
          </button>
          <p className="text-xs text-gray-500 text-center">
            We&rsquo;ll email you a one-tap link. No password needed.
          </p>
        </form>
      )}

      <p className="text-center text-sm text-gray-600 mt-6">
        {mode === 'signin' ? (
          <>
            New here?{' '}
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="text-brand-700 font-bold hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Create an account →
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="text-brand-700 font-bold hover:underline focus-visible:outline-none focus-visible:underline"
            >
              Sign in →
            </button>
          </>
        )}
      </p>

      <p className="text-center text-xs text-gray-400 mt-4">
        Use the same account as the Baha Buddy mobile app.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-brand-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center gap-4">
          <BahaLogo href="/" size="lg" />
          <p className="text-brand-700 font-medium">Your Bahamas, your way.</p>
        </div>
        <Suspense fallback={<div className="bg-white rounded-2xl shadow-lg p-8 animate-pulse h-80" />}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  )
}
