'use client'

/**
 * /login — combined Sign In / Sign Up surface.
 *
 * One page, top-level toggle: [Sign In] [Sign Up].
 * Each mode supports password OR magic link (passwordless).
 *
 * Sign Up specifics:
 *   - Optional display_name captured at signup → stored in
 *     user_metadata so onboarding can pre-fill it later.
 *   - After password signup: Supabase sends a confirmation email;
 *     we show a "check your email" success state.
 *   - After magic-link signup: same flow as signin magic link.
 *
 * Redirect logic:
 *   - Sign in respects ?redirect=, default /dashboard.
 *   - Sign up now also respects ?redirect= so account-gated flows
 *     like Concierge Checkout can return to payment after auth.
 *   - If no redirect is supplied, dashboard/onboarding gates continue
 *     to route the user appropriately.
 *   - ?mode=signup pre-selects the Sign Up tab so marketing CTAs can deep-link.
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

  const postAuthPath = redirectParam

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
          text: 'Account created. Check your email for a confirmation link to continue.',
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
            ? "We've sent a magic link to your email. Open it to continue."
            : 'Check your email for the magic link!',
      })
    } finally {
      setLoading(false)
    }
  }

  const methodButtonClass = (nextMethod: Method) => [
    'flex-1 rounded-full py-2 text-xs font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200',
    method === nextMethod
      ? 'bg-brand-600 text-white shadow-sm'
      : 'text-gray-600 hover:bg-white hover:text-night',
  ].join(' ')

  const primaryButtonClass = 'inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div className="rounded-baha-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex rounded-full bg-gray-100 p-1 mb-5">
        <button type="button" onClick={() => switchMode('signin')} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 ${mode === 'signin' ? 'bg-white text-night shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} aria-pressed={mode === 'signin'}>Sign in</button>
        <button type="button" onClick={() => switchMode('signup')} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 ${mode === 'signup' ? 'bg-white text-night shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} aria-pressed={mode === 'signup'}>Sign up</button>
      </div>

      <div className="mb-5 flex rounded-full border border-gray-200 bg-gray-50 p-1 text-xs">
        <button type="button" onClick={() => { setMethod('password'); setMessage(null) }} className={methodButtonClass('password')} aria-pressed={method === 'password'}>Password</button>
        <button type="button" onClick={() => { setMethod('magic'); setMessage(null) }} className={methodButtonClass('magic')} aria-pressed={method === 'magic'}>Magic link</button>
      </div>

      {message && <div role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-lg px-4 py-3 mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>}

      {method === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {mode === 'signup' && <div><label htmlFor="auth-name" className="block text-sm font-medium text-gray-700 mb-1">What should Buddy call you? <span className="text-gray-400 font-normal">(optional)</span></label><input id="auth-name" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="First name" autoComplete="given-name" maxLength={60} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" /></div>}
          <div><label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label><input id="auth-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" /></div>
          <div><label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label><input id="auth-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" /></div>
          <button type="submit" disabled={loading} className={primaryButtonClass}>

            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
          {mode === 'signup' && <div><label htmlFor="magic-name" className="block text-sm font-medium text-gray-700 mb-1">What should Buddy call you? <span className="text-gray-400 font-normal">(optional)</span></label><input id="magic-name" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="First name" autoComplete="given-name" maxLength={60} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" /></div>}
          <div><label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label><input id="magic-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" /></div>
          <button type="submit" disabled={loading} className={primaryButtonClass}>

            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center"><BahaLogo className="mx-auto h-12 w-auto" /><h1 className="mt-4 text-3xl font-bold text-gray-900">Welcome to Baha Buddy</h1><p className="mt-2 text-gray-600">Sign in or create an account to continue.</p></div>
        <Suspense fallback={<div className="rounded-baha-lg border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">Loading...</div>}><AuthForm /></Suspense>
      </div>
    </main>
  )
}
