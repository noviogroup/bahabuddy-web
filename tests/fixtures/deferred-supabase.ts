import type { SupabaseClient } from '@supabase/supabase-js'

type AnyRecord = Record<string, (...args: unknown[]) => unknown>

/**
 * Synchronous client double for `createPublicClient()` that forwards every
 * query to the (async) client a test configured for `createClient()`. Chained
 * builder calls are recorded and replayed on the real double when awaited, so
 * tests keep one mock client for both the cookie and the public client.
 */
export function deferredSupabaseClient(resolveClient: () => unknown): SupabaseClient {
  const chain = (start: (client: AnyRecord) => unknown) => {
    const calls: Array<[PropertyKey, unknown[]]> = []
    const run = async () => {
      let target = start((await resolveClient()) as AnyRecord)
      for (const [method, args] of calls) {
        target = (target as AnyRecord)[method as string](...args)
      }
      return target
    }
    const proxy: unknown = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            return (onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
              run().then(onFulfilled, onRejected)
          }
          return (...args: unknown[]) => {
            calls.push([prop, args])
            return proxy
          }
        },
      },
    )
    return proxy
  }

  return {
    from: (table: string) => chain((client) => client.from(table)),
    rpc: (name: string, params?: unknown) => chain((client) => client.rpc(name, params)),
  } as unknown as SupabaseClient
}
