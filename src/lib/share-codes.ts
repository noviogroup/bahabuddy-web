import { randomBytes } from 'node:crypto'

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** Unguessable share code: base62 chars from a CSPRNG (16 chars ≈ 95 bits). */
export function generateShareCode(length = 16): string {
  let out = ''
  while (out.length < length) {
    const bytes = randomBytes(length * 2)
    for (let i = 0; i < bytes.length && out.length < length; i++) {
      // 248 = 62 * 4 → reject higher bytes to avoid modulo bias.
      if (bytes[i] < 248) out += BASE62[bytes[i] % 62]
    }
  }
  return out
}

/**
 * Shape check for share codes arriving in URLs. Covers legacy 7-char codes,
 * `inv-` invite codes, mobile codes and the new 16-char codes; anything else
 * is rejected before touching the database.
 */
export const SHARE_CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/

export function isValidShareCode(code: unknown): code is string {
  return typeof code === 'string' && SHARE_CODE_PATTERN.test(code)
}

/** Default lifetime for public 'link' shares created on web. */
export const PUBLIC_SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000
