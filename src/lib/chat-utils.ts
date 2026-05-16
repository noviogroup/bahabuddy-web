// Shared chat utilities — no 'use client' so usable in server routes and client components

export type CardType =
  | 'hotel' | 'restaurant' | 'activity' | 'flight'
  | 'day_plan' | 'summary' | 'map' | 'destination' | 'mixed'

export interface ParsedCard {
  card_type: CardType
  cards?: ParsedCard[]
  [key: string]: unknown
}

const CARD_BLOCK_RE = /```(?:card-data|json)\n([\s\S]*?)\n```/

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

export function deriveTitleFromMessage(text: string): string {
  const cleaned = text.trim().replace(/[^\w\s]/g, ' ').trim()
  const words = cleaned.split(/\s+/).slice(0, 6).join(' ')
  return words.length > 0 ? words : 'New Chat'
}
