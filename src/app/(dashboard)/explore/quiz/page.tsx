import type { Metadata } from 'next'
import Link from 'next/link'
import IslandQuiz from '@/components/IslandQuiz'

export const metadata: Metadata = {
  title: 'What Bahamas Island Are You? | Baha Buddy',
  description:
    'Take our 5-question island personality quiz and discover which Bahamas island matches your travel style.',
}

/**
 * /explore/quiz — Island personality quiz (C.10).
 *
 * Migrated into the (dashboard) route group so it shares the shell. The
 * quiz itself is unchanged — wrapped in <IslandQuiz>.
 *
 * Inline back link to /explore so quiz-takers can return to the Discover
 * feed without going through the sidebar.
 */
export default function IslandQuizPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-night transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Explore
        </Link>
      </div>

      <IslandQuiz />
    </main>
  )
}
