// PostHog LLM analytics for Buddy's Claude calls on the web chat route.
//
// Events go straight to PostHog's batch capture endpoint (no SDK). Only usage
// and outcome signals are sent: message text stays out of PostHog, matching
// the mobile chat proxy. Capture is a no-op until NEXT_PUBLIC_POSTHOG_KEY is
// set, and it never throws into a chat turn.

const DEFAULT_HOST = 'https://us.i.posthog.com'
const CAPTURE_TIMEOUT_MS = 3000

export type PostHogEvent = {
  event: string
  distinct_id: string
  properties: Record<string, unknown>
  timestamp: string
}

type AnthropicUsage = {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}

// Signed-out chats are keyed by trace and create no PostHog person.
function identity(distinctId: string | null | undefined, traceId: string) {
  return distinctId
    ? { distinct_id: distinctId, personProps: {} }
    : { distinct_id: traceId, personProps: { $process_person_profile: false } }
}

export function aiGenerationEvent(args: {
  distinctId?: string | null
  traceId: string
  sessionId?: string | null
  model: string
  responseId?: string | null
  usage?: AnthropicUsage | null
  latencyMs: number
  stopReason?: string | null
  properties?: Record<string, unknown>
}): PostHogEvent {
  const { distinct_id, personProps } = identity(args.distinctId, args.traceId)
  const usage = args.usage ?? {}
  return {
    event: '$ai_generation',
    distinct_id,
    timestamp: new Date().toISOString(),
    properties: {
      $ai_trace_id: args.traceId,
      ...(args.sessionId ? { $ai_session_id: args.sessionId } : {}),
      $ai_provider: 'anthropic',
      $ai_model: args.model,
      $ai_base_url: 'https://api.anthropic.com',
      ...(args.responseId ? { $ai_response_id: args.responseId } : {}),
      $ai_input: null,
      $ai_output_choices: null,
      $ai_input_tokens: usage.input_tokens ?? 0,
      $ai_output_tokens: usage.output_tokens ?? 0,
      $ai_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      $ai_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      $ai_latency: args.latencyMs / 1000,
      $ai_http_status: 200,
      $ai_is_error: false,
      ...(args.stopReason ? { $ai_stop_reason: args.stopReason } : {}),
      ...personProps,
      ...args.properties,
    },
  }
}

export function aiTraceEvent(args: {
  distinctId?: string | null
  traceId: string
  sessionId?: string | null
  name: string
  latencyMs: number
  error?: unknown
  properties?: Record<string, unknown>
}): PostHogEvent {
  const { distinct_id, personProps } = identity(args.distinctId, args.traceId)
  const error = args.error === undefined ? null : describeError(args.error)
  return {
    event: '$ai_trace',
    distinct_id,
    timestamp: new Date().toISOString(),
    properties: {
      $ai_trace_id: args.traceId,
      ...(args.sessionId ? { $ai_session_id: args.sessionId } : {}),
      $ai_trace_name: args.name,
      $ai_latency: args.latencyMs / 1000,
      $ai_is_error: Boolean(error),
      ...(error ? { $ai_error: error } : {}),
      ...personProps,
      ...args.properties,
    },
  }
}

// Error class and HTTP status only; messages can echo request content.
function describeError(error: unknown): string {
  const status = (error as { status?: unknown } | null)?.status
  const name = error instanceof Error ? error.name : 'UnknownError'
  return typeof status === 'number' ? `${name} ${status}` : name
}

export async function capturePostHogEvents(
  events: PostHogEvent[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()
  if (!apiKey || events.length === 0) return
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_HOST).replace(/\/+$/, '')
  try {
    const response = await fetchImpl(`${host}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, batch: events }),
      signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
    })
    if (!response.ok) console.error(`[posthog] capture rejected: HTTP ${response.status}`)
  } catch (error) {
    console.error('[posthog] capture failed', error)
  }
}
