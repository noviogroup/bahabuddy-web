// Shared chat utilities — no 'use client' so usable in server routes and client components

export type CardType =
  | 'hotel' | 'restaurant' | 'activity' | 'flight'
  | 'day_plan' | 'summary' | 'map' | 'destination' | 'mixed'

export interface ParsedCard {
  card_type: CardType
  cards?: ParsedCard[]
  [key: string]: unknown
}

// Only the documented ```card-data fence is treated as a card block. The old
// ```json alias let ordinary JSON code blocks in prose become cards.
const CARD_FENCE_OPEN = '```card-data'
const CARD_BLOCK_RE = /```card-data\n([\s\S]*?)\n```/

export function parseCardsFromContent(content: string): { text: string; cards: ParsedCard[] } {
  const cards: ParsedCard[] = []
  let cleaned = content

  let match: RegExpExecArray | null
  const regex = new RegExp(CARD_BLOCK_RE.source, 'g')
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed && typeof parsed === 'object' && ('card_type' in parsed || 'cards' in parsed)) {
        cards.push(parsed as ParsedCard)
        cleaned = cleaned.replace(match[0], '')
      }
    } catch {
      // not valid card JSON
    }
  }

  return { text: cleaned.trim(), cards }
}

/**
 * Card types the MODEL may author in a card-data fence. Inventory cards
 * (hotel / restaurant / activity / flight / destination) must come from
 * DB-backed tool results emitted by the server — never from model text.
 */
export const MODEL_AUTHORED_CARD_TYPES: ReadonlySet<string> = new Set(['day_plan', 'summary', 'map'])

const MAP_LOCATION_TYPES = new Set(['hotel', 'activity', 'restaurant', 'airport', 'island'])

function sanitizeModelCard(card: ParsedCard): ParsedCard | null {
  if (!card || typeof card !== 'object') return null
  if (!MODEL_AUTHORED_CARD_TYPES.has(card.card_type)) return null
  if (card.card_type === 'map') {
    // Model-supplied coordinates are not grounded; keep names only so the
    // map resolves pins from known island/place names.
    const locations = Array.isArray(card.locations)
      ? (card.locations as unknown[])
          .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
          .filter(l => typeof l.name === 'string' && l.name.trim())
          .slice(0, 20)
          .map(l => ({
            name: String(l.name).slice(0, 120),
            ...(typeof l.type === 'string' && MAP_LOCATION_TYPES.has(l.type) ? { type: l.type } : {}),
          }))
      : undefined
    const { locations: _drop, ...rest } = card
    void _drop
    return locations && locations.length > 0 ? { ...rest, locations } : rest as ParsedCard
  }
  return card
}

/**
 * Filter model-authored fence cards down to the safe synthesized types.
 * `mixed` bundles are unwrapped and filtered recursively (one level).
 */
export function filterModelAuthoredCards(cards: ParsedCard[]): ParsedCard[] {
  const out: ParsedCard[] = []
  for (const card of cards) {
    if (!card || typeof card !== 'object') continue
    const cardType = (card as { card_type?: unknown }).card_type
    const isBundle = cardType === 'mixed' || (cardType === undefined && Array.isArray(card.cards))
    if (isBundle) {
      const nested = (Array.isArray(card.cards) ? card.cards : [])
        .map(sanitizeModelCard)
        .filter((c): c is ParsedCard => c !== null)
      if (nested.length > 0) out.push({ card_type: 'mixed', cards: nested })
      continue
    }
    const safe = sanitizeModelCard(card)
    if (safe) out.push(safe)
  }
  return out
}

/** Length of the longest suffix of `text` that is a proper prefix of `token`. */
function partialTokenSuffixLength(text: string, token: string): number {
  const max = Math.min(text.length, token.length - 1)
  for (let len = max; len > 0; len--) {
    if (token.startsWith(text.slice(text.length - len))) return len
  }
  return 0
}

/**
 * The user-visible part of streamed assistant text: complete card-data
 * fences are removed, anything from an unclosed fence opener onward is
 * hidden (in-progress or truncated JSON), and a trailing partial opener
 * (e.g. "``") is held back until it can be classified.
 *
 * The result only ever grows as more text arrives, so it is safe to stream
 * the difference between successive calls.
 */
export function visibleAssistantText(raw: string): string {
  let out = ''
  let rest = raw
  while (true) {
    const open = rest.indexOf(CARD_FENCE_OPEN)
    if (open === -1) {
      return out + rest.slice(0, rest.length - partialTokenSuffixLength(rest, CARD_FENCE_OPEN))
    }
    out += rest.slice(0, open)
    const close = rest.indexOf('\n```', open + CARD_FENCE_OPEN.length)
    if (close === -1) return out // unclosed fence — hide it
    rest = rest.slice(close + 4)
  }
}

/** Final display/persist text: fences (closed or truncated) removed, trimmed. */
export function stripCardFences(raw: string): string {
  return visibleAssistantText(raw + '\n').trim()
}

/**
 * Incremental filter for streaming: feed raw deltas, get back only the text
 * that is safe to show (never card-data JSON).
 */
export class CardFenceStreamFilter {
  private raw = ''
  private emitted = 0

  push(delta: string): string {
    this.raw += delta
    const visible = visibleAssistantText(this.raw)
    if (visible.length <= this.emitted) return ''
    const out = visible.slice(this.emitted)
    this.emitted = visible.length
    return out
  }
}

export function deriveTitleFromMessage(text: string): string {
  const cleaned = text.trim().replace(/[^\w\s]/g, ' ').trim()
  const words = cleaned.split(/\s+/).slice(0, 6).join(' ')
  return words.length > 0 ? words : 'New Chat'
}
