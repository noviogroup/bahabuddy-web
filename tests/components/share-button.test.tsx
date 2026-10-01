import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ShareButton from '@/components/ShareButton'

const writeText = vi.fn()

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
afterEach(() => vi.unstubAllGlobals())

describe('ShareButton (F56/F114)', () => {
  test('copies only the server-confirmed link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'AbCdEfGh12345678' }), { status: 200 })))
    render(<ShareButton tripId="trip-1" />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/share/AbCdEfGh12345678`))
    expect(await screen.findByText('Copied!')).toBeInTheDocument()
  })

  test('shows an error and copies nothing when creation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Could not create a share link.' }), { status: 500 })))
    render(<ShareButton tripId="trip-1" />)
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create a share link.')
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  test('never gets stuck generating when the clipboard throws', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'AbCdEfGh12345678' }), { status: 200 })))
    render(<ShareButton tripId="trip-1" />)
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByLabelText('Trip share link')).toHaveValue(`${window.location.origin}/share/AbCdEfGh12345678`)
    expect(screen.queryByText('Generating...')).not.toBeInTheDocument()
  })
})
