import { describe, expect, it } from 'vitest'
import {
  ANTHROPIC_PRICING_VERSION,
  anthropicModelRates,
  buildAnthropicUsageRow,
  estimateAnthropicCost,
} from '@/lib/provider-telemetry'

describe('canonical web provider telemetry', () => {
  it('prices Sonnet 4.6 and Sonnet 5 independently', () => {
    expect(anthropicModelRates('claude-sonnet-4-6')).toMatchObject({ input: 3, output: 15 })
    expect(anthropicModelRates('claude-sonnet-5')).toMatchObject({ input: 2, output: 10 })
    expect(estimateAnthropicCost({
      model: 'claude-sonnet-5',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })).toBe(12)
  })

  it('records model, tokens, latency, cost, and stable request identity', () => {
    const row = buildAnthropicUsageRow({
      model: 'claude-sonnet-4-6',
      iteration: 2,
      providerRequestId: 'msg_123',
      correlationId: '11111111-1111-4111-8111-111111111111',
      edgeRequestId: 'edge-123',
      userId: 'user-1',
      threadId: 'thread-1',
      tripId: 'trip-1',
      inputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: 50,
      cacheWriteTokens: 10,
      latencyMs: 321.4,
      promptVersion: 'grounded-destination-v1',
    })

    expect(ANTHROPIC_PRICING_VERSION).toContain('2026-08-10')
    expect(row.model).toBe('claude-sonnet-4-6')
    expect(row.model_iteration).toBe(2)
    expect(row.input_tokens).toBe(100)
    expect(row.output_tokens).toBe(20)
    expect(row.latency_ms).toBe(321)
    expect(row.estimated_cost_usd).toBeGreaterThan(0)
    expect(row.telemetry_status).toBe('captured')
    expect(row.idempotency_key).toContain('msg_123')
  })
})
