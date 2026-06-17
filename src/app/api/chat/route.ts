import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { parseCardsFromContent, deriveTitleFromMessage, type ParsedCard } from '@/lib/chat-utils'
import { TOOL_DEFINITIONS, executeTool, toolProgressLabel } from '@/lib/chat-tools'
import type { CardData } from '@/components/RichCards'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

/**
 * BUDDY_SYSTEM_PROMPT — canonical mobile system prompt, now with tool_use.
 *
 * Source: /Baha-Buddy-V2/supabase/functions/claude-chat-proxy/system-prompt.ts
 *
 * Differences from the B.14 web prompt (which had a Knowledge Mode stub):
 *   - Adds TOOL USE RULES section pointing at the 9 wired tools
 *   - Updates CARD OUTPUT FORMAT — tells Claude that hotel/restaurant/
 *     activity/flight/destination cards are emitted by the SERVER from
 *     tool results. Claude only composes day_plan / summary / map cards
 *     via a fenced JSON block.
 *
 * Cached via cache_control: ephemeral. Date placeholders substituted per
 * request — these break the cache once per day, which is fine.
 *
 * Template-literal escape note: any raw backtick inside this string must
 * be escaped as a backslash-backtick (one `\` followed by one backtick).
 * The string contains several triple-backtick code fences for the model
 * — each backtick in those fences is individually escaped. A single
 * un-escaped backtick prematurely terminates the template literal and
 * cascades into a parser error spanning the rest of the file.
 */
const BUDDY_SYSTEM_PROMPT = `You are Buddy, the AI travel companion inside the Baha Buddy app. You specialize exclusively in the Bahamas — every island, every hotel, every restaurant, every hidden gem.

## WHO YOU ARE
You are a stylized Bahamian guide — a cool island brother with relaxed, confident energy. The kind of guy who leans back in a beach chair and says "I got you" and means it completely. You know every island intimately. You are not a search engine. You are not a booking form. You are a knowledgeable, warm, culturally grounded island friend.

## PERSONALITY TRAITS (Always Present)
- Cool and confident — never anxious, never over-eager, never robotic
- Knowledgeable — you know every island, every spot, every season
- Proactive — you offer opinions and suggestions, don't just wait for questions
- Culturally grounded — authentic Bahamian cultural awareness, occasional local phrases
- Respectful — never pushy about bookings or upsells
- Concise — respond with personality but don't ramble. Keep text responses under 200 words unless building an itinerary.

## FORMATTING RULES (Critical — this is a chat app, NOT a document)
- Write in natural conversational prose. NO Markdown headers (#), NO bullet lists (- or *), NO numbered lists.
- For emphasis, you may use **bold** sparingly for place names or key phrases only.
- When presenting options or itinerary ideas, write them as short flowing paragraphs, not formatted lists.
- Use line breaks between distinct ideas but keep the tone like you're texting a friend, not writing a report.
- Example of what NOT to do: "**Option 1: Split Island Trip**\\n- Days 1-2: Exuma\\n- Days 3-4: Harbour Island"
- Example of what TO do: "Here's what I'd do — spend the first two days in Exuma swimming with the pigs and exploring the cays, then hop over to Harbour Island for a couple days of pink sand and sunset dining."
- Never use emoji excessively. One per message max, and only when it adds warmth.

## ADAPTIVE TONE RULES
Detect the trip context from user messages and their profile, then shift your tone accordingly:

**Luxury / Honeymoon** — When the user says "honeymoon," "anniversary," "upscale," or their interest_tags include Romance + Luxury:
→ Polished, elevated, tasteful. Recommend private experiences and premium options first.
→ Example: "I've got the perfect spot — Harbour Island, pink sand, private cabana dining at sunset."

**Budget / Backpacking** — When the user mentions budget constraints, asks for "cheap" options, or party_type is Solo:
→ Friendly, resourceful, real. Highlight local spots and value options.
→ Example: "Yo, you don't need to spend big to eat good. Let me show you where the locals go."

**Family Vacation** — When children_count > 0 or the user mentions kids:
→ Warm, practical, reassuring. Flag kid-friendly activities, calm beaches, family resorts.
→ Example: "The kids are gonna lose their minds at Atlantis. And Cabbage Beach is super calm for little ones."

**Adventure / Group** — When interest_tags include Adventure or party_type is Friends:
→ Energetic, exciting, social. Highlight active experiences and nightlife.
→ Example: "You want to swim with sharks? Say less. Dean's Blue Hole is calling your name."

**Solo Explorer** — When party_type is Solo and interests suggest exploration:
→ Cool, encouraging, insider-ish.
→ Example: "Solo in the Bahamas? You're about to have the best time. Let me put you on some hidden gems."

## TOOL USE RULES
You have 9 tools wired to live data. ALWAYS use these before recommending specific places — never hallucinate names.

**get_hotels(island_id, price_range?, min_rating?, limit?)** — Curated Bahamas hotel catalog. Call when the user asks where to stay.
**get_restaurants(island_id, cuisine_type?, price_range?, limit?)** — Curated restaurant catalog. Call when the user asks about food/dining.
**get_activities(island_id, vibe_tags?, kid_friendly?, limit?)** — Tours, attractions, experiences. Call when the user asks "what should I do".
**search_flights(origin_city, destination, departure_date, return_date?, passengers?)** — Live LiteAPI flight offers. Call when the user asks about flights.
**get_trip_details(trip_id)** — Pull current trip state.
**get_user_profile()** — Extra profile context beyond what's in user context.
**create_itinerary_item(trip_id, day_number, time_slot, activity_type, name, notes?)** — Adds to the user's trip. Call when they say "add this".
**get_weather(island_id)** — Current + 7-day forecast (Open-Meteo).
**get_island_info(island_id)** — Static overview, highlights, best time to visit.

**Tool use guidelines:**
- Call tools BEFORE recommending specific places. Match your text to what tools returned.
- If a tool returns empty results, say so honestly: "I checked and couldn't find anything matching that on [island]. Want me to look at other islands?"
- When building itineraries, batch tool calls so day plans are built from real data.
- Limit to 3-4 tool calls per response — keeps latency reasonable. If you need more, ask the user to narrow the ask.
- For general questions ("best time to visit," "what's the food like"), you may answer from knowledge without tools.

## CARD OUTPUT FORMAT
The web app renders cards differently depending on the source:

**SERVER-RENDERED (do NOT emit JSON for these):**
- hotel, restaurant, activity, flight, destination cards are created automatically by the system from your tool call results.
- Just call the appropriate tool and write conversational prose. The cards render alongside your text.
- Mapping: get_hotels → hotel cards, get_restaurants → restaurant cards, get_activities → activity cards, search_flights → flight cards (carries cabin class, layovers, baggage), get_island_info → destination card (carries best-months bar, getting-there, days-recommended).

**YOU emit (use a \`\`\`card-data fence):**
When you're SYNTHESIZING from multiple tools or producing a higher-level summary, emit a card block at the very end of your response.

Card types YOU emit:

- **day_plan** — one day of a trip you composed.
  Required: day_number (int), morning, afternoon, evening (each a short string).
  Optional: day_date (free-form, e.g. "Saturday Jun 14"), day_pace ("relaxed" | "moderate" | "packed" — vibe check, not math), day_total_cost (int, sum of activity costs).

- **summary** — trip-level wrap-up before the Stripe handoff.
  Required: trip_name, days (int), islands (string[]), travelers (int), total_cost (int).
  Optional: date_range (free-form, e.g. "Jun 12 – Jun 19"), cost_breakdown ({hotel?: int, flights?: int, activities?: int, food?: int, other?: int}). When you've estimated the costs, always include cost_breakdown — the card renders a visual stacked bar. Breakdown amounts should sum roughly to total_cost.

- **map** — itinerary map for multi-stop trips.
  Required: title, subtitle, islands (string[] — names auto-resolve to coords).
  Optional: locations (Array<{name, lat?, lng?, type: "hotel"|"activity"|"restaurant"|"airport"|"island"}>) when you want explicit pins instead of island-level.

For multiple day_plans across a trip, wrap them in mixed:
\`\`\`card-data
{"card_type":"mixed","cards":[{"card_type":"day_plan","day_number":1,"morning":"...","afternoon":"...","evening":"..."},{"card_type":"day_plan","day_number":2,...}]}
\`\`\`

Rules:
- Only emit card blocks for synthesized content (day plans you composed, trip summaries you built, maps you assembled).
- Never emit hotel/restaurant/activity/flight/destination cards — the server emits those from your tools.
- Emit ONE card block per response, at the very end.
- Pull islands from the user's plan, not made-up data.
- For day_plan, set day_pace from activity density: 1 main thing = relaxed, 2 anchors = moderate, 3+ = packed.

## SCOPE & GUARDRAILS
- **Bahamas only.** If asked about other destinations: "I'm your Bahamas expert! For other spots, I'd recommend a general travel planner. But hey — have you considered the Bahamas instead?"
- **Privacy first.** Never repeat or display passport data, payment info, or sensitive fields.
- **Booking flow:** Present Summary Card → user confirms → Payment Card → hand off to Stripe. Never auto-initiate payments.
- **Frustration handling:** If the user seems frustrated, acknowledge warmly and offer to start fresh or try a different approach.
- **No medical/legal advice.** For health or safety questions, recommend consulting local authorities or travel advisories.

## DATE AWARENESS (Critical)
- Today's date is **{{TODAY_DATE}}** and the current year is **{{CURRENT_YEAR}}**.
- When a user says dates like "June 3" without specifying a year, ALWAYS assume the NEXT upcoming occurrence. If that date has already passed this year, use next year.
- Never recommend trip dates in the past. All trip planning dates MUST be today or in the future.
- When calling search_flights, ALWAYS use YYYY-MM-DD format with the correct future year.
- Example: If today is March 6, 2026 and the user says "June 3 to June 10", use departure_date "2026-06-03", return_date "2026-06-10".
- Example: If today is March 6, 2026 and the user says "February 14", that has already passed this year, so use "2027-02-14".`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SummaryCard {
  card_type: 'summary'
  trip_name?: string
  days?: number
  islands?: string[]
  total_cost?: number
  travelers?: number
}

function extractSummaryCard(cards: ParsedCard[]): SummaryCard | null {
  for (const card of cards) {
    if (card.card_type === 'summary') return card as unknown as SummaryCard
    if (card.card_type === 'mixed' && Array.isArray(card.cards)) {
      const nested = card.cards.find(c => c.card_type === 'summary')
      if (nested) return nested as unknown as SummaryCard
    }
  }
  return null
}

function buildUserContext(opts: {
  profile?: {
    display_name?: string | null
    party_type?: string | null
    party_size?: number | null
    interest_tags?: string[] | null
    city?: string | null
    country?: string | null
    children_count?: number | null
    children_ages?: number[] | null
  } | null
  tripContext?: { name?: string; islands?: string[]; date_start?: string; date_end?: string; id?: string } | null
}): string {
  const p = opts.profile
  const t = opts.tripContext
  const lines: string[] = ['## CURRENT USER CONTEXT']

  if (p) {
    if (p.display_name) lines.push(`Name: ${p.display_name}`)
    if (p.city || p.country) lines.push(`Location: ${[p.city, p.country].filter(Boolean).join(', ')}`)
    const partySize = p.party_size ?? 1
    const partyType = p.party_type ?? 'solo'
    const kids = (p.children_count ?? 0) > 0
      ? `, ${p.children_count} children ages ${(p.children_ages ?? []).join(', ')}`
      : ''
    lines.push(`Travel Party: ${partyType} (${partySize} travelers${kids})`)
    const tags = p.interest_tags ?? []
    if (tags.length) lines.push(`Interests: ${tags.join(', ')}`)
  } else {
    lines.push('Guest user — limited profile available')
  }

  if (t) {
    const islands = (t.islands ?? []).join(', ') || 'TBD'
    const dates = t.date_start || t.date_end
      ? ` — ${t.date_start ?? '?'} to ${t.date_end ?? '?'}`
      : ''
    lines.push(`\nActive Trip: "${t.name ?? 'Unnamed trip'}" — Islands: ${islands}${dates}`)
    if (t.id) lines.push(`Active Trip ID: ${t.id}`)
  } else {
    lines.push('\nNo active trip yet.')
  }

  return lines.join('\n')
}

// ──────────────────────────────────────────────────────────────────────────
// Agentic loop config
// ──────────────────────────────────────────────────────────────────────────
const MAX_TURNS = 4        // hard cap on tool→model round-trips per request
const MAX_TOOL_CALLS = 8   // hard cap on total tool invocations per request
const MODEL = 'claude-sonnet-4-5'

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], tripContext, threadId } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.warn('[chat] auth.getUser() returned error', authError)
    }
    if (!user) {
      console.warn('[chat] no authenticated user on /api/chat — chat will respond but NOTHING will be persisted to chat_threads/chat_messages. Most likely cause: Supabase session cookie missing/invalid on this request.')
    }

    let activeThreadId: string | null = threadId ?? null
    let userProfile: {
      display_name?: string | null
      party_type?: string | null
      party_size?: number | null
      interest_tags?: string[] | null
      city?: string | null
      country?: string | null
      children_count?: number | null
      children_ages?: number[] | null
    } | null = null

    if (user) {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('display_name, party_type, party_size, interest_tags, city, country, children_count, children_ages')
          .eq('id', user.id)
          .single()
        if (profile) userProfile = profile
      } catch {
        // continue without profile
      }

      if (!activeThreadId) {
        const { data: thread, error: threadInsertError } = await supabase
          .from('chat_threads')
          .insert({
            user_id: user.id,
            title: deriveTitleFromMessage(message),
            last_message_preview: message.slice(0, 100),
          })
          .select('id')
          .single()
        if (threadInsertError) {
          console.error('[chat] chat_threads insert FAILED', {
            user_id: user.id,
            code: threadInsertError.code,
            message: threadInsertError.message,
            details: threadInsertError.details,
            hint: threadInsertError.hint,
          })
        }
        activeThreadId = thread?.id ?? null
      }

      if (activeThreadId) {
        const { error: userMsgError } = await supabase.from('chat_messages').insert({
          thread_id: activeThreadId,
          role: 'user',
          content: message,
          card_type: 'none',
        })
        if (userMsgError) {
          console.error('[chat] chat_messages (user) insert FAILED', {
            thread_id: activeThreadId,
            code: userMsgError.code,
            message: userMsgError.message,
            details: userMsgError.details,
            hint: userMsgError.hint,
          })
        }
      } else {
        console.warn('[chat] no activeThreadId after thread creation — user message NOT saved')
      }
    }

    // ── Build system prompt (date substitution + cache_control) ───────
    const today = new Date()
    const todayISO = today.toISOString().split('T')[0]
    const year = today.getFullYear().toString()
    const staticPrompt = BUDDY_SYSTEM_PROMPT
      .replace(/\{\{TODAY_DATE\}\}/g, todayISO)
      .replace(/\{\{CURRENT_YEAR\}\}/g, year)

    const userContext = buildUserContext({ profile: userProfile, tripContext })

    // ── Conversation history ──────────────────────────────────────────
    // Note: messages array is mutable across the agentic loop — each tool
    // result gets appended as a user-role tool_result message.
    const messages: Anthropic.MessageParam[] = [
      ...(history as ChatMessage[]).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const encoder = new TextEncoder()
    const isNewThread = !!user && !!activeThreadId && !threadId

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }

        if (isNewThread) send({ type: 'thread_id', threadId: activeThreadId })

        let allText = ''                  // accumulated text across all loop turns
        const allCards: CardData[] = []   // server-emitted cards from tool results
        let toolCallCount = 0

        try {
          // ── Agentic loop ─────────────────────────────────────────────
          for (let turn = 0; turn < MAX_TURNS; turn++) {
            const response = await client.messages.stream({
              model: MODEL,
              max_tokens: 2048,
              system: [
                { type: 'text', text: staticPrompt, cache_control: { type: 'ephemeral' } },
                { type: 'text', text: userContext },
              ],
              tools: TOOL_DEFINITIONS as unknown as Anthropic.Tool[],
              messages,
            })

            // Stream text deltas to client during this turn
            let turnText = ''
            for await (const event of response) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                turnText += event.delta.text
                send({ type: 'text_delta', delta: event.delta.text })
              }
            }
            allText += turnText

            // Get final message to inspect tool_use blocks + stop_reason
            const finalMessage = await response.finalMessage()

            // Collect tool_use blocks
            const toolUses = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
            )

            if (toolUses.length === 0 || finalMessage.stop_reason !== 'tool_use') {
              // No tools requested — we're done
              break
            }

            // Append assistant turn (text + tool_use blocks) to messages
            messages.push({ role: 'assistant', content: finalMessage.content })

            // Execute each tool, build tool_result blocks
            const toolResultBlocks: Anthropic.ToolResultBlockParam[] = []
            for (const toolUse of toolUses) {
              if (toolCallCount >= MAX_TOOL_CALLS) {
                toolResultBlocks.push({
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify({
                    error: 'Tool call limit reached for this request. Wrap up your response or ask the user to narrow.',
                  }),
                })
                continue
              }
              toolCallCount++

              send({ type: 'tool_start', tool: toolUse.name, label: toolProgressLabel(toolUse.name) })

              const toolResult = await executeTool(
                toolUse.name,
                (toolUse.input ?? {}) as Record<string, unknown>,
                supabase,
                user?.id ?? null,
              )

              // Accumulate server-emitted cards
              if (toolResult.cards && toolResult.cards.length > 0) {
                allCards.push(...toolResult.cards)
              }

              send({ type: 'tool_complete', tool: toolUse.name })

              toolResultBlocks.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify(toolResult.data),
              })
            }

            // Append tool results as a user message and loop
            messages.push({ role: 'user', content: toolResultBlocks })
          }

          // ── Parse synthesized cards from Claude's text (day_plan / summary / map)
          const { text: cleanText, cards: fenceCards } = parseCardsFromContent(allText)

          // Combine: server-emitted (concrete data) + Claude-emitted (synthesized).
          // Concrete data first so users see the lookup results before the summary.
          const combinedCards: CardData[] = [
            ...allCards,
            ...(fenceCards as CardData[]),
          ]

          // ── Persistence + trip auto-save ─────────────────────────────
          let savedTripId: string | null = null
          if (user && activeThreadId) {
            try {
              const { error: asstMsgError } = await supabase.from('chat_messages').insert({
                thread_id: activeThreadId,
                role: 'assistant',
                content: cleanText,
                card_type: combinedCards.length > 0 ? (combinedCards[0].card_type ?? 'none') : 'none',
                card_data: combinedCards.length > 0 ? combinedCards : null,
              })
              if (asstMsgError) {
                console.error('[chat] chat_messages (assistant) insert FAILED', {
                  thread_id: activeThreadId,
                  code: asstMsgError.code,
                  message: asstMsgError.message,
                  details: asstMsgError.details,
                  hint: asstMsgError.hint,
                })
              }
              const { error: threadUpdateError } = await supabase
                .from('chat_threads')
                .update({
                  last_message_preview: cleanText.slice(0, 100),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', activeThreadId)
              if (threadUpdateError) {
                console.error('[chat] chat_threads update FAILED', {
                  thread_id: activeThreadId,
                  code: threadUpdateError.code,
                  message: threadUpdateError.message,
                })
              }

              // Auto-save trip if Claude emitted a summary card
              const summaryCard = extractSummaryCard(fenceCards as ParsedCard[])
              if (summaryCard) {
                const tripName = summaryCard.trip_name || deriveTitleFromMessage(message)
                const { data: newTrip } = await supabase
                  .from('trips')
                  .insert({
                    user_id: user.id,
                    name: tripName,
                    status: 'draft',
                    islands: summaryCard.islands ?? [],
                    party_size: summaryCard.travelers ?? userProfile?.party_size ?? 1,
                    party_type: userProfile?.party_type ?? 'solo',
                    budget_estimate: summaryCard.total_cost ?? null,
                  })
                  .select('id')
                  .single()
                if (newTrip) {
                  savedTripId = newTrip.id

                  // Save day_plan activities from synthesized cards
                  const dayPlans = (fenceCards as ParsedCard[]).flatMap(c => {
                    if (c.card_type === 'day_plan') return [c]
                    if (c.card_type === 'mixed' && Array.isArray(c.cards)) {
                      return c.cards.filter(nc => nc.card_type === 'day_plan')
                    }
                    return []
                  })

                  if (dayPlans.length > 0) {
                    const activities = dayPlans.flatMap((dp, idx) => {
                      const dayNum = (dp.day_number as number) ?? idx + 1
                      return [
                        dp.morning ? { trip_id: savedTripId, day_number: dayNum, time_slot: 'morning', activity_name: dp.morning as string, sort_order: 0 } : null,
                        dp.afternoon ? { trip_id: savedTripId, day_number: dayNum, time_slot: 'afternoon', activity_name: dp.afternoon as string, sort_order: 1 } : null,
                        dp.evening ? { trip_id: savedTripId, day_number: dayNum, time_slot: 'evening', activity_name: dp.evening as string, sort_order: 2 } : null,
                      ].filter((x): x is NonNullable<typeof x> => x !== null)
                    })
                    if (activities.length > 0) {
                      await supabase.from('trip_activities').insert(activities)
                    }
                  }
                }
              }
            } catch (persistErr) {
              console.error('Persistence error:', persistErr)
              // continue — response still goes to client
            }
          }

          // ── Emit final events ────────────────────────────────────────
          if (combinedCards.length > 0) {
            send({ type: 'cards', cards: combinedCards })
          }
          const donePayload: Record<string, unknown> = { type: 'done' }
          if (savedTripId) donePayload.tripId = savedTripId
          send(donePayload)
        } catch (err) {
          console.error('Chat agentic loop error:', err)
          send({ type: 'error', message: 'Something went wrong. Please try again.' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
