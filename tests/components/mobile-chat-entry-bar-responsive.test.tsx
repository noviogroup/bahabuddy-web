import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import MobileChatEntryBar from '@/components/home/MobileChatEntryBar'

describe('MobileChatEntryBar responsive dock', () => {
  test('reserves phone layout space instead of overlaying dashboard content', () => {
    const { container } = render(<MobileChatEntryBar />)
    const dock = container.firstElementChild
    const button = screen.getByRole('button', { name: /Tell me what you're thinking/i })

    expect(dock).toHaveClass('shrink-0')
    expect(dock).toHaveClass('sm:hidden')
    expect(dock).not.toHaveClass('sticky')
    expect(dock).not.toHaveClass('fixed')
    expect(button).toHaveClass('min-h-14')
  })
})
