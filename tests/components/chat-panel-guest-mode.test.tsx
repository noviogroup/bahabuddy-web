import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ChatPanel from '@/components/dashboard/ChatPanel'

const chatPanelMocks = vi.hoisted(() => ({
  search: '',
  from: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(chatPanelMocks.search),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: chatPanelMocks.from,
  }),
}))

describe('ChatPanel guest mode', () => {
  beforeEach(() => {
    chatPanelMocks.search = ''
    chatPanelMocks.from.mockReset()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('lets public visitors chat without loading private conversation history', () => {
    render(<ChatPanel mode="standalone" guestMode />)

    expect(screen.getByText('Guest chat')).toBeInTheDocument()
    expect(screen.getByText(/Ask Buddy about islands, hotels, food, flights, and tours/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Sign in to save' })[0]).toHaveAttribute(
      'href',
      '/login?redirect=%2Fdashboard%2Fchat',
    )
    expect(screen.queryByRole('link', { name: /Dashboard/i })).not.toBeInTheDocument()
    expect(chatPanelMocks.from).not.toHaveBeenCalled()
  })

  test('preserves public Ask Buddy query text in the message box', async () => {
    chatPanelMocks.search = 'q=Help+me+compare+Exuma+stays'

    render(<ChatPanel mode="standalone" guestMode />)

    await waitFor(() => {
      expect(screen.getByLabelText('Message Baha Buddy')).toHaveValue('Help me compare Exuma stays')
    })
  })

  test('auto-starts a marked Buddy handoff query once', async () => {
    chatPanelMocks.search = 'q=Help+me+plan+around+Grand+Isle&start=1'
    const encoder = new TextEncoder()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"text_delta","delta":"I can help with Grand Isle."}\n\n'))
          controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
          controller.close()
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ChatPanel mode="standalone" guestMode />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Help me plan around Grand Isle')).toBeInTheDocument()
    expect(await screen.findByText('I can help with Grand Isle.')).toBeInTheDocument()
    expect(screen.getByLabelText('Message Baha Buddy')).toHaveValue('')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"message":"Help me plan around Grand Isle"'),
      }),
    )
  })
})
