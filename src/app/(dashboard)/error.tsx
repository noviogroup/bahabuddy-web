'use client'

/**
 * Error boundary for the (dashboard) route group.
 *
 * Catches uncaught errors thrown by any descendant server or client
 * component and renders a friendly recovery screen instead of the
 * Next.js default error page.
 *
 * The shell (Sidebar + ChatPanel) stays visible — only the main content
 * area is replaced. The user can navigate away via the sidebar without
 * losing chat state.
 *
 * Must be a client component (Next.js requirement for error boundaries).
 *
 * Pairs with `not-found.tsx` for 404 handling.
 */

import { useEffect } from 'react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to whatever monitoring tool we end up wiring in D.10.
    // For now, console — at least it's captured in browser devtools.
    console.error('[dashboard error boundary]', error)
  }, [error])

  return (
    <main className="max-w-xl mx-auto px-4 py-16">
      <div className="bg-white rounded-baha-lg border border-coral-200 p-8 sm:p-10 shadow-soft text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-coral-50 mb-4">
          <svg
            className="w-7 h-7 text-coral-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-night mb-2">Something went sideways</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto">
          We hit an unexpected snag loading this page. Your trips and chat history are safe —
          this is just the page that failed.
        </p>

        {/* Show error digest in production, full message in development.
            error.digest is set by Next.js and is safe to surface. */}
        {error.digest && (
          <p className="mt-4 text-xs text-gray-400 font-mono break-all">
            Reference: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV !== 'production' && error.message && (
          <details className="mt-4 text-left text-xs text-gray-500">
            <summary className="cursor-pointer font-semibold">Error detail (dev only)</summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded-md overflow-auto whitespace-pre-wrap break-all">
              {error.message}
              {error.stack && '\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try again
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-full transition-colors border border-gray-200"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
