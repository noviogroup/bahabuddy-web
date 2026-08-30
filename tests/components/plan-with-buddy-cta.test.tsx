import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PlanWithBuddyCTA } from '@/components/detail/PlanWithBuddyCTA'

function buddyPromptFromHref(href: string | null): string {
  expect(href).toBeTruthy()
  const url = new URL(href!, 'http://localhost:3000')
  return url.searchParams.get('q') ?? ''
}

describe('PlanWithBuddyCTA', () => {
  test('keeps the shared detail CTA conversational instead of routing add actions into chat', () => {
    render(
      <PlanWithBuddyCTA
        kind="meal"
        planPrompt="Tell me about Graycliff in Nassau, Bahamas"
        addPrompt="Add Graycliff to my Bahamas dining plan"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Fit it into your day' })).toBeInTheDocument()
    expect(screen.queryByText('Add it to your plan')).not.toBeInTheDocument()

    const askBuddy = screen.getByRole('link', { name: /Ask Buddy about this/i })
    expect(askBuddy).toHaveClass('border-brand-200')
    expect(askBuddy).toHaveClass('text-brand-700')
    expect(askBuddy).not.toHaveClass('bg-night')
    expect(askBuddy).not.toHaveClass('hover:bg-gray-900')
    expect(askBuddy.querySelector('.bg-gold-400')).not.toBeInTheDocument()

    const primaryPrompt = buddyPromptFromHref(
      askBuddy.getAttribute('href'),
    )
    expect(primaryPrompt).toBe('Tell me about Graycliff in Nassau, Bahamas')

    const planningPrompt = buddyPromptFromHref(
      screen.getByRole('link', { name: 'Plan around this' }).getAttribute('href'),
    )
    expect(planningPrompt).toBe('Help me plan around Graycliff')
    expect(planningPrompt).not.toMatch(/^(add|save|book)\b/i)
    expect(planningPrompt).not.toContain('to my Bahamas dining plan')
  })

  test('normalizes legacy trip add wording into planning guidance', () => {
    render(
      <PlanWithBuddyCTA
        kind="experience"
        planPrompt="Tell me about Pink Sands Beach"
        addPrompt="Add Pink Sands Beach to my trip."
      />,
    )

    const planningPrompt = buddyPromptFromHref(
      screen.getByRole('link', { name: 'Plan around this' }).getAttribute('href'),
    )

    expect(planningPrompt).toBe('Help me plan around Pink Sands Beach')
    expect(planningPrompt).not.toContain('to my trip')
  })
})
