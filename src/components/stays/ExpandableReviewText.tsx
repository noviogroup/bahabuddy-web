'use client'

import { useId, useMemo, useState } from 'react'

const collapsedLineClasses = {
  5: 'line-clamp-5',
  6: 'line-clamp-6',
  7: 'line-clamp-7',
  8: 'line-clamp-8',
} as const

interface ExpandableReviewTextProps {
  text: string
  className?: string
  collapsedLines?: keyof typeof collapsedLineClasses
  minLength?: number
}

export default function ExpandableReviewText({
  text,
  className = '',
  collapsedLines = 7,
  minLength = 360,
}: ExpandableReviewTextProps) {
  const contentId = useId()
  const [expanded, setExpanded] = useState(false)
  const reviewText = useMemo(() => text.replace(/\s+/g, ' ').trim(), [text])
  const canExpand = reviewText.length > minLength
  const clampClass = canExpand && !expanded ? collapsedLineClasses[collapsedLines] : ''

  if (!reviewText) return null

  return (
    <div className="mt-4">
      <p id={contentId} className={`${className} ${clampClass}`.trim()}>
        {reviewText}
      </p>
      {canExpand && (
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
