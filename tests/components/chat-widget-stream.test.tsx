import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import ChatWidget from '@/components/ChatWidget'
import { SummaryCard } from '@/components/cards/SummaryCard'
import { ActionRow } from '@/components/cards/shared/ActionRow'

const THREAD = '11111111-2222-4333-8444-555555555555'

function sseResponse(events: object[]) {
  const enc = new TextEncoder()
  return {
    ok: true,
    status: 200,
    body: new ReadableStream({
      start(controller) {
        for (const e of events) controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`))
        controller.close()
      },
    }),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function send(text: string) {
  const box = screen.getByLabelText('Message Baha Buddy')
  fireEvent.change(box, { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
}

describe('ChatWidget streaming (F15/F52/F79/F53)', () => {
  test('renders server cards, announces the finished reply, and reuses the thread id', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(sseResponse([
        { type: 'thread_id', threadId: THREAD },
        { type: 'text_delta', delta: 'Try these stays.' },
        { type: 'cards', cards: [{ card_type: 'day_plan', day_number: 1, morning: 'Snorkel Thunderball Grotto', afternoon: 'Lunch', evening: 'Sunset' }] },
        { type: 'done', text: 'Try these stays.' },
      ]))
      .mockResolvedValueOnce(sseResponse([{ type: 'done', text: 'Second reply.' }]))
    vi.stubGlobal('fetch', fetchMock)

    render(<ChatWidget />)
    const toggle = screen.getByRole('button', { name: 'Chat with Baha Buddy' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('dialog', { name: 'Chat with Baha Buddy' })).toBeInTheDocument()
    expect(screen.getByRole('log', { name: 'Conversation with Baha Buddy' })).toHaveAttribute('aria-live', 'off')

    send('Where to stay in Exuma?')
    expect(await screen.findByText('Try these stays.')).toBeInTheDocument()
    expect(await screen.findByText(/Thunderball Grotto/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Baha Buddy replied: Try these stays.')

    send('And restaurants?')
    expect(await screen.findByText('Second reply.')).toBeInTheDocument()
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(secondBody.threadId).toBe(THREAD)
    // Greeting (leading assistant turn) is still sent but the server drops it; empty turns are not sent.
    expect(secondBody.history.every((m: { content: string }) => m.content.trim().length > 0)).toBe(true)
  })

  test('shows the server error message instead of an empty bubble', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([{ type: 'error', message: 'Something went wrong. Please try again.' }])))
    render(<ChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Chat with Baha Buddy' }))
    send('hi')
    const log = screen.getByRole('log', { name: 'Conversation with Baha Buddy' })
    expect(await within(log).findByText('Something went wrong. Please try again.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Something went wrong')
  })

  test('surfaces the 429 rate-limit message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      body: null,
      json: async () => ({ error: 'You\'re sending messages faster than Buddy can keep up. Please wait 30 seconds and try again.' }),
    }))
    render(<ChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Chat with Baha Buddy' }))
    send('hi')
    const log = screen.getByRole('log', { name: 'Conversation with Baha Buddy' })
    await waitFor(() => expect(within(log).getByText(/Please wait 30 seconds/)).toBeInTheDocument())
  })
})

describe('SummaryCard CTA (F16)', () => {
  test('routes to the saved trip and never passes a model-estimated amount', () => {
    render(<SummaryCard data={{ trip_name: 'Exuma', total_cost: 4200, travelers: 2 }} tripId={THREAD} />)
    const link = screen.getByRole('link', { name: /Review and book this trip/ })
    expect(link).toHaveAttribute('href', `/trip/${THREAD}`)
    expect(link.getAttribute('href')).not.toContain('amount')
  })

  test('hides the CTA when no trip was saved', () => {
    render(<SummaryCard data={{ trip_name: 'Exuma', total_cost: 4200 }} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('ActionRow safe hrefs (F65/F133)', () => {
  test('drops javascript: links and keeps http/tel links', () => {
    render(
      <ActionRow actions={[
        { label: 'Website', icon: null, href: 'javascript:alert(1)', external: true },
        { label: 'Menu', icon: null, href: 'https://example.com/menu', external: true },
        { label: 'Call', icon: null, href: 'tel:+12425550100' },
      ]} />,
    )
    expect(screen.queryByText('Website')).not.toBeInTheDocument()
    expect(screen.getByText('Menu').closest('a')).toHaveAttribute('href', 'https://example.com/menu')
    expect(screen.getByText('Call').closest('a')).toHaveAttribute('href', 'tel:+12425550100')
  })
})
