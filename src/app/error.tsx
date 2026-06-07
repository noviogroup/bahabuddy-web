'use client'

/**
 * Root error boundary — required alongside app/loading.tsx.
 * Catches errors on public/marketing routes (e.g. home after sign-out).
 */

import { useEffect } from 'react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[root error boundary]', error)
  }, [error])

  return (
    <main className="min-h-screen bg-offwhite flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-baha-lg border border-coral-200 p-8 sm:p-10 shadow-soft text-center">
        <h1 className="text-xl font-bold text-night mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          We couldn&apos;t load this page. Try again or head back home.
        </p>

        {error.digest && (
          <p className="mt-4 text-xs text-gray-400 font-mono break-all">Reference: {error.digest}</p>
        )}

        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors border border-gray-200"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  )
}
