import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

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

Today's date: ${new Date().toISOString().split('T')[0]}`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], tripContext } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 })
    }

    // Try to get user context if authenticated
    let systemPrompt = SYSTEM_PROMPT
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
      }
    } catch {
      // Continue without user context
    }

    const messages: Anthropic.MessageParam[] = [
      ...(history as ChatMessage[]).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Stream the response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
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
              const data = JSON.stringify({ type: 'text_delta', delta: event.delta.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } else if (event.type === 'message_stop') {
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
