/**
 * Shared client for the /api/chat SSE protocol, used by ChatPanel and
 * ChatWidget so both handle every event the same way.
 *
 * Events: thread_id, text_delta, tool_start, tool_complete, cards, done, error.
 * The server's `cards` event is the COMPLETE card list (tool cards plus the
 * filtered synthesized cards) — clients must not re-parse fences from text.
 */

export interface ChatStreamHandlers<Card = unknown> {
  onThreadId?: (threadId: string) => void
  /** Called with the accumulated visible text after each delta. */
  onText?: (fullText: string) => void
  onToolStart?: (label: string) => void
  onToolComplete?: () => void
  onCards?: (cards: Card[]) => void
  onDone?: (done: { text: string; tripId?: string; assistantMessageId?: string }) => void
  onError?: (message: string) => void
}

export const CHAT_FALLBACK_ERROR = "Sorry, I couldn't connect right now. Please try again!"

/** Human-readable error for a non-OK /api/chat response (429/413/400 carry a JSON `error`). */
export async function chatErrorFromResponse(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string' && (res.status === 429 || res.status === 413 || res.status === 400)) {
      return body.error
    }
  } catch {
    // ignore
  }
  return CHAT_FALLBACK_ERROR
}

/**
 * Reads the SSE body to completion, dispatching events. Returns the final
 * visible text. `isCurrent` lets callers ignore a stream that no longer
 * belongs to the active conversation (e.g. after a thread switch).
 */
export async function readChatStream<Card = unknown>(
  body: ReadableStream<Uint8Array>,
  handlers: ChatStreamHandlers<Card>,
  isCurrent: () => boolean = () => true,
): Promise<{ text: string; sawDone: boolean; sawError: boolean }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let sawDone = false
  let sawError = false

  const handle = (line: string) => {
    if (!line.startsWith('data: ')) return
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(line.slice(6))
    } catch {
      return
    }
    if (!isCurrent()) return
    switch (parsed.type) {
      case 'thread_id':
        if (typeof parsed.threadId === 'string') handlers.onThreadId?.(parsed.threadId)
        break
      case 'text_delta':
        if (typeof parsed.delta === 'string') {
          fullText += parsed.delta
          handlers.onText?.(fullText)
        }
        break
      case 'tool_start':
        handlers.onToolStart?.(typeof parsed.label === 'string' ? parsed.label : `Using ${String(parsed.tool ?? 'a tool')}…`)
        break
      case 'tool_complete':
        handlers.onToolComplete?.()
        break
      case 'cards':
        if (Array.isArray(parsed.cards)) handlers.onCards?.(parsed.cards as Card[])
        break
      case 'done': {
        sawDone = true
        const text = typeof parsed.text === 'string' ? parsed.text : fullText.trim()
        fullText = text
        handlers.onDone?.({
          text,
          tripId: typeof parsed.tripId === 'string' ? parsed.tripId : undefined,
          assistantMessageId: typeof parsed.assistantMessageId === 'string' ? parsed.assistantMessageId : undefined,
        })
        break
      }
      case 'error':
        sawError = true
        handlers.onError?.(typeof parsed.message === 'string' ? parsed.message : CHAT_FALLBACK_ERROR)
        break
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const event of events) handle(event)
  }
  if (buffer) handle(buffer)

  return { text: fullText, sawDone, sawError }
}

/** History to send: plain, non-empty text turns only (the server re-validates). */
export function chatHistoryForRequest(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  limit = 10,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter(m => typeof m.content === 'string' && m.content.trim())
    .slice(-limit)
    .map(m => ({ role: m.role, content: m.content }))
}
