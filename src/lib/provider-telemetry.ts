import type { SupabaseClient } from '@supabase/supabase-js'

export const ANTHROPIC_PRICING_VERSION = 'anthropic-public-global-standard-2026-08-10'

export function anthropicModelRates(model: string) {
  if (model.includes('sonnet-5')) {
    return { input: 2, cacheRead: 0.2, cacheWrite: 2.5, output: 10 }
  }
  if (model.includes('haiku')) {
    return { input: 1, cacheRead: 0.1, cacheWrite: 1.25, output: 5 }
  }
  return { input: 3, cacheRead: 0.3, cacheWrite: 3.75, output: 15 }
}

export function estimateAnthropicCost(args: {
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}): number {
  const rate = anthropicModelRates(args.model)
  return (
    args.inputTokens * rate.input +
    args.outputTokens * rate.output +
    args.cacheReadTokens * rate.cacheRead +
    args.cacheWriteTokens * rate.cacheWrite
  ) / 1_000_000
}

export function buildAnthropicUsageRow(args: {
  model: string
  iteration: number
  providerRequestId: string
  correlationId: string
  edgeRequestId: string
  userId?: string | null
  threadId?: string | null
  tripId?: string | null
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  latencyMs: number
  promptVersion: string
}) {
  const estimatedCostUsd = estimateAnthropicCost(args)
  return {
    idempotency_key: `anthropic:${args.providerRequestId}:${args.model}:${args.iteration}`,
    provider: 'anthropic',
    service: 'claude_messages',
    action: 'chat_iteration',
    edge_function: 'web-api-chat',
    model: args.model,
    model_iteration: args.iteration,
    provider_request_id: args.providerRequestId,
    provider_request_id_status: 'reported',
    correlation_id: args.correlationId,
    edge_request_id: args.edgeRequestId,
    user_id: args.userId ?? null,
    thread_id: args.threadId ?? null,
    trip_id: args.tripId ?? null,
    planning_session_id: null,
    input_tokens: args.inputTokens,
    output_tokens: args.outputTokens,
    cache_read_tokens: args.cacheReadTokens,
    cache_write_tokens: args.cacheWriteTokens,
    token_usage_status: 'reported',
    usage_quantity: null,
    usage_unit: null,
    pricing_version: ANTHROPIC_PRICING_VERSION,
    estimated_cost_usd: estimatedCostUsd,
    cost_status: 'estimated',
    request_status: 'success',
    status_code: 200,
    latency_ms: Math.max(0, Math.round(args.latencyMs)),
    telemetry_status: 'captured',
    metadata: {
      channel: 'web',
      prompt_version: args.promptVersion,
    },
    occurred_at: new Date().toISOString(),
  }
}

export async function recordAnthropicUsage(
  supabase: SupabaseClient,
  args: Parameters<typeof buildAnthropicUsageRow>[0],
): Promise<void> {
  const row = buildAnthropicUsageRow(args)
  const { error } = await supabase
    .from('provider_usage_events')
    .upsert(row, { onConflict: 'idempotency_key', ignoreDuplicates: true })
  if (error) throw new Error(error.message ?? 'provider usage insert failed')
}
