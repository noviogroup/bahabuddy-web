import { afterEach, describe, expect, test, vi } from 'vitest'

import { aiGenerationEvent, aiTraceEvent, capturePostHogEvents } from '@/lib/posthog-ai'

const traceId = '11111111-1111-4111-8111-111111111111'

describe('posthog-ai', () => {
  afterEach(() => vi.unstubAllEnvs())

  test('generation events carry usage and latency but no message text', () => {
    const event = aiGenerationEvent({
      distinctId: 'user-1',
      traceId,
      sessionId: 'thread-1',
      model: 'claude-sonnet-4-6',
      responseId: 'msg_123',
      usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 7500 },
      latencyMs: 2500,
      stopReason: 'end_turn',
      properties: { channel: 'web' },
    })

    expect(event.event).toBe('$ai_generation')
    expect(event.distinct_id).toBe('user-1')
    expect(event.properties).toMatchObject({
      $ai_trace_id: traceId,
      $ai_session_id: 'thread-1',
      $ai_provider: 'anthropic',
      $ai_model: 'claude-sonnet-4-6',
      $ai_input_tokens: 1200,
      $ai_output_tokens: 300,
      $ai_cache_read_input_tokens: 7500,
      $ai_cache_creation_input_tokens: 0,
      $ai_latency: 2.5,
      $ai_stop_reason: 'end_turn',
      $ai_input: null,
      $ai_output_choices: null,
      channel: 'web',
    })
    expect(event.properties).not.toHaveProperty('$process_person_profile')
  })

  test('signed-out chats are keyed by trace without creating a person', () => {
    const event = aiTraceEvent({ distinctId: null, traceId, name: 'buddy_chat_turn', latencyMs: 4000 })

    expect(event.distinct_id).toBe(traceId)
    expect(event.properties).toMatchObject({
      $ai_trace_name: 'buddy_chat_turn',
      $ai_latency: 4,
      $ai_is_error: false,
      $process_person_profile: false,
    })
    expect(event.properties).not.toHaveProperty('$ai_input_state')
    expect(event.properties).not.toHaveProperty('$ai_output_state')
  })

  test('errors record the class and status, not the message', () => {
    const error = Object.assign(new Error('prompt text could leak here'), { name: 'APIError', status: 529 })
    const event = aiTraceEvent({ distinctId: 'user-1', traceId, name: 'buddy_chat_turn', latencyMs: 900, error })

    expect(event.properties.$ai_is_error).toBe(true)
    expect(event.properties.$ai_error).toBe('APIError 529')
  })

  test('capture is a no-op without a project key', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')
    const fetchImpl = vi.fn()
    await capturePostHogEvents([aiTraceEvent({ traceId, name: 't', latencyMs: 1 })], fetchImpl)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('capture posts one batch and swallows failures', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com/')
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}'))
    const events = [aiTraceEvent({ traceId, name: 't', latencyMs: 1 })]

    await capturePostHogEvents(events, fetchImpl)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://eu.i.posthog.com/batch/')
    expect(JSON.parse(init.body)).toEqual({ api_key: 'phc_test', batch: events })

    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      capturePostHogEvents(events, vi.fn().mockRejectedValue(new TypeError('offline'))),
    ).resolves.toBeUndefined()
    errorLog.mockRestore()
  })
})
