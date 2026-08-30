import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import ExpandableReviewText from '@/components/stays/ExpandableReviewText'

const longReview = [
  'The Perfect Luxury Vacation for Families.',
  'My family returned from a lovely five-night stay and the resort worked well for beach time, pool days, and relaxed dinners.',
  'The grounds were lush, the staff remembered small details, and the location made it easy to slow down without losing access to restaurants.',
  'There were a few busy moments around check-in, but overall it felt polished and comfortable for a family trip.',
].join(' ')

describe('ExpandableReviewText', () => {
  test('truncates long reviews until the traveler reads more', () => {
    render(<ExpandableReviewText text={longReview} className="text-sm" />)

    const review = screen.getByText(longReview)
    expect(review).toHaveClass('line-clamp-7')
    const readMore = screen.getByRole('button', { name: 'Read more' })
    expect(readMore).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(readMore)

    expect(review).not.toHaveClass('line-clamp-7')
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
  })

  test('leaves short reviews as plain readable text', () => {
    render(<ExpandableReviewText text="Great beach access and kind staff." className="text-sm" />)

    expect(screen.getByText('Great beach access and kind staff.')).not.toHaveClass('line-clamp-7')
    expect(screen.queryByRole('button', { name: 'Read more' })).not.toBeInTheDocument()
  })
})
