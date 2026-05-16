import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { parseCardsFromContent, deriveTitleFromMessage } from '@/lib/chat-utils'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are Baha Buddy, a friendly and knowledgeable AI travel assistant specializing exclusively in The Bahamas. You help travelers plan unforgettable Bahamas vacations.

You can help with:
- Island recommendations (Nassau/Paradise Island, Exumas, Harbour Island, Eleuthera, Abacos, Bimini, Grand Bahama, Long Island, and more)
- Activities and attractions: snorkeling, diving, swimming with pigs, beach hopping, fishing, boating
- Where to eat: local restaurants, seafood, conch dishes, rum bars
- Accommodation advice: resorts, boutique hotels, vacation rentals
- Getting around: ferries, domestic flights, water taxis, car rentals
- Best travel times, weather, packing tips
- Bahamas culture, history, and local customs
- Trip budgeting and practical tips

Always be warm, enthusiastic, and helpful. Keep responses concise (2-4 paragraphs max). Use a friendly conversational tone. When recommending specific places, briefly explain what makes them special.

## Rich Card Output

When you recommend specific hotels, restaurants, activities, flights, destinations, or provide an itinerary/day plan/trip summary, append a structured card block AFTER your text response. This block is rendered visually for the user — do NOT mention the JSON block in your text.

Use this exact format at the very end of your response:

\`\`\`card-data
{"card_type":"<type>","cards":[...]}
\`\`\`

**Card types and fields:**

hotel: name, island, rating (0-5 float), stars (1-5 int), price_per_night (int), amenities (string[]), photo_url (optional)
restaurant: name, island, cuisine, rating (float), price_level (1-4 int), photo_url (optional)
activity: name, description, duration (e.g. "3 hours"), from_price (float), rating (float), icon (dive/swim/snorkel/beach/sail/fish/hike/kayak/tour/culture), photo_url (optional)
flight: route (e.g. "JFK → NAS"), airline, departure, arrival, duration, stops ("Direct" or "1 stop"), price (int)
day_plan: day_number (int), morning (string), afternoon (string), evening (string)
destination: name, tagline, rating, price_from (int), duration (e.g. "3-5 days"), highlights (string[]), photo_url (optional)
summary: trip_name, days (int), islands (string[]), total_cost (int), travelers (int)
map: title, islands (string[]), subtitle (optional)

For **mixed** (multiple cards of different types): {"card_type":"mixed","cards":[...card objects...]}
For **multiple same-type items** (e.g. 3 hotel options): {"card_type":"mixed","cards":[{"card_type":"hotel",...},{...},{...}]}

Rules:
- Only emit card blocks for concrete recommendations (not general advice)
- Emit ONE card block per response, at the very end
- Use realistic, plausible data. Do not invent exact prices if unknown — omit the price field instead
- Keep card data concise; 2-4 items max in a mixed block

Today's date: ${new Date().toISOString().split('T')[0]}`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], tripContext, threadId } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let systemPrompt = SYSTEM_PROMPT
    let activeThreadId: string | null = threadId ?? null

    if (user) {
      // Personalize system prompt
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('display_name, party_type, party_size, interest_tags')
          .eq('id', user.id)
          .single()

        if (profile) {
          systemPrompt += `\n\nUser context: ${profile.display_name ? `Name: ${profile.display_name}.` : ''} Travel party: ${profile.party_size || 1} ${profile.party_type || 'traveler'}(s). Interests: ${(profile.interest_tags || []).join(', ') || 'general travel'}.`
        }

        if (tripContext) {
          systemPrompt += `\n\nActive trip: ${tripContext.name || 'Unnamed trip'}. Islands: ${(tripContext.islands || []).join(', ') || 'TBD'}. Dates: ${tripContext.date_start || 'TBD'} to ${tripContext.date_end || 'TBD'}.`
        }
      } catch {
        // continue without profile
      }

      // Create thread if not provided
      if (!activeThreadId) {
        const { data: thread } = await supabase
          .from('chat_threads')
          .insert({
            user_id: user.id,
            title: deriveTitleFromMessage(message),
            last_message_preview: message.slice(0, 100),
          })
          .select('id')
          .single()
        activeThreadId = thread?.id ?? null
      }

      // Save user message
      if (activeThreadId) {
        await supabase.from('chat_messages').insert({
          thread_id: activeThreadId,
          role: 'user',
          content: message,
          card_type: 'none',
        })
      }
    }

    const messages: Anthropic.MessageParam[] = [
      ...(history as ChatMessage[]).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const encoder = new TextEncoder()
    let fullAssistantText = ''
    const isNewThread = user && activeThreadId && !threadId

    const stream = new ReadableStream({
      async start(controller) {
        // Emit thread ID so client can track the session
        if (isNewThread) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thread_id', threadId: activeThreadId })}\n\n`))
        }

        try {
          const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: systemPrompt,
            messages,
            stream: true,
          })

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullAssistantText += event.delta.text
              const data = JSON.stringify({ type: 'text_delta', delta: event.delta.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } else if (event.type === 'message_stop') {
              // Persist assistant response to Supabase
              if (user && activeThreadId && fullAssistantText) {
                try {
                  const { text: cleanText, cards } = parseCardsFromContent(fullAssistantText)
                  await supabase.from('chat_messages').insert({
                    thread_id: activeThreadId,
                    role: 'assistant',
                    content: cleanText,
                    card_type: cards.length > 0 ? (cards[0].card_type ?? 'none') : 'none',
                    card_data: cards.length > 0 ? cards : null,
                  })
                  await supabase.from('chat_threads').update({
                    last_message_preview: cleanText.slice(0, 100),
                    updated_at: new Date().toISOString(),
                  }).eq('id', activeThreadId)
                } catch {
                  // DB save failure doesn't break the response
                }
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
            }
          }
        } catch {
          const errData = JSON.stringify({ type: 'error', message: 'Something went wrong. Please try again.' })
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`))
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
