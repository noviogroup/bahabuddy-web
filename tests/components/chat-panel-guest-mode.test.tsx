import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
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
})
