import * as React from 'react'

/**
 * React `cache()` for per-request dedupe of server-side loaders. Next's
 * server runtime always provides it; plain React 18 (unit tests) does not,
 * so fall back to calling the loader directly there.
 */
type CacheFn = <T extends (...args: never[]) => unknown>(fn: T) => T

export const requestCache: CacheFn =
  (React as unknown as { cache?: CacheFn }).cache ?? ((fn) => fn)
