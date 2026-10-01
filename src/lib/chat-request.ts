/**
 * Server-side validation for POST /api/chat bodies.
 *
 * The client's history is untrusted: only plain-text user/assistant turns
 * are forwarded to Anthropic. Tool-use / tool-result / image / document
 * blocks, unknown roles and empty turns are dropped, and turn count and
 * sizes are capped so one request cannot carry an unbounded context.
 */

export interface ChatHistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatTripContext {
  id?: string
  name?: string
  islands?: string[]
  date_start?: string
  date_end?: string
}

export interface ValidChatRequest {
  message: string
  history: ChatHistoryTurn[]
  tripContext: ChatTripContext | null
  threadId: string | null
  /** Trip Buddy already saved earlier in this conversation (reused, not duplicated). */
  draftTripId: string | null
}

export type ChatRequestResult =
  | { ok: true; value: ValidChatRequest }
  | { ok: false; status: 400 | 413; error: string }

export interface ChatLimits {
  maxMessageChars: number
  maxHistoryTurns: number
  maxTurnChars: number
  maxHistoryChars: number
}

export const AUTH_CHAT_LIMITS: ChatLimits = {
  maxMessageChars: 4000,
  maxHistoryTurns: 20,
  maxTurnChars: 4000,
  maxHistoryChars: 24000,
}

export const GUEST_CHAT_LIMITS: ChatLimits = {
  maxMessageChars: 2000,
  maxHistoryTurns: 10,
  maxTurnChars: 3000,
  maxHistoryChars: 12000,
}

/** Raw body cap checked before JSON parsing (bytes, approximate). */
export const MAX_CHAT_BODY_BYTES = 128 * 1024

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function cleanShortString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  // Collapse whitespace/newlines so client text cannot fake new prompt sections.
  const cleaned = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/[#`"]/g, '').replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned.slice(0, max) : undefined
}

export function sanitizeTripContext(value: unknown): ChatTripContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const ctx: ChatTripContext = {}
  if (typeof raw.id === 'string' && UUID_RE.test(raw.id)) ctx.id = raw.id
  const name = cleanShortString(raw.name, 120)
  if (name) ctx.name = name
  if (Array.isArray(raw.islands)) {
    const islands = raw.islands
      .map(i => cleanShortString(i, 60))
      .filter((i): i is string => Boolean(i))
      .slice(0, 12)
    if (islands.length) ctx.islands = islands
  }
  for (const key of ['date_start', 'date_end'] as const) {
    const v = raw[key]
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) ctx[key] = v.slice(0, 10)
  }
  return Object.keys(ctx).length > 0 ? ctx : null
}

/** Extract plain text from a history item's content, or null if it is not plain text. */
function plainText(content: unknown): string | null {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    // Keep only text blocks; tool_use / tool_result / image / document blocks
    // are dropped so forged "grounded" results never reach the model.
    const parts = content
      .filter((b): b is { type: 'text'; text: string } =>
        !!b && typeof b === 'object' && (b as { type?: unknown }).type === 'text' && typeof (b as { text?: unknown }).text === 'string')
      .map(b => b.text)
    return parts.length ? parts.join('\n') : null
  }
  return null
}

export function sanitizeHistory(value: unknown, limits: ChatLimits): ChatHistoryTurn[] {
  if (!Array.isArray(value)) return []
  const turns: ChatHistoryTurn[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const { role, content } = item as { role?: unknown; content?: unknown }
    if (role !== 'user' && role !== 'assistant') continue
    const text = plainText(content)?.trim()
    if (!text) continue // empty turns make Anthropic reject the request
    turns.push({ role, content: text.slice(0, limits.maxTurnChars) })
  }

  // Keep the most recent turns within the count and total-size budgets.
  let recent = turns.slice(-limits.maxHistoryTurns)
  let total = recent.reduce((n, t) => n + t.content.length, 0)
  while (recent.length > 0 && total > limits.maxHistoryChars) {
    total -= recent[0].content.length
    recent = recent.slice(1)
  }

  // Merge consecutive same-role turns and make the history start with a user
  // turn (drops a leading assistant greeting). The live user message is
  // appended after, so a trailing user turn is merged away too.
  const merged: ChatHistoryTurn[] = []
  for (const turn of recent) {
    const prev = merged[merged.length - 1]
    if (prev && prev.role === turn.role) prev.content = `${prev.content}\n\n${turn.content}`
    else merged.push({ ...turn })
  }
  while (merged.length > 0 && merged[0].role !== 'user') merged.shift()
  while (merged.length > 0 && merged[merged.length - 1].role !== 'assistant') merged.pop()
  return merged
}

export function validateChatRequest(body: unknown, opts: { authenticated: boolean }): ChatRequestResult {
  const limits = opts.authenticated ? AUTH_CHAT_LIMITS : GUEST_CHAT_LIMITS
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Invalid request body' }
  }
  const raw = body as Record<string, unknown>
  if (typeof raw.message !== 'string' || !raw.message.trim()) {
    return { ok: false, status: 400, error: 'message is required' }
  }
  const message = raw.message.trim()
  if (message.length > limits.maxMessageChars) {
    return {
      ok: false,
      status: 413,
      error: `Message is too long. Please keep it under ${limits.maxMessageChars} characters.`,
    }
  }
  if (raw.history !== undefined && !Array.isArray(raw.history)) {
    return { ok: false, status: 400, error: 'history must be an array' }
  }
  if (Array.isArray(raw.history) && raw.history.length > 100) {
    return { ok: false, status: 413, error: 'Conversation history is too large' }
  }
  const threadId = typeof raw.threadId === 'string' && UUID_RE.test(raw.threadId) ? raw.threadId : null
  const draftTripId = typeof raw.draftTripId === 'string' && UUID_RE.test(raw.draftTripId) ? raw.draftTripId : null

  return {
    ok: true,
    value: {
      message,
      history: sanitizeHistory(raw.history, limits),
      tripContext: sanitizeTripContext(raw.tripContext),
      threadId,
      draftTripId,
    },
  }
}
