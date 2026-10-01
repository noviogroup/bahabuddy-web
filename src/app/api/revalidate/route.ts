import { timingSafeEqual } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

// Sanity slugs are lowercase kebab-case; anything else is not revalidated.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.SANITY_REVALIDATE_SECRET
  const secret = req.headers.get('x-sanity-webhook-secret')

  // Fail closed: an unset secret means the webhook is not configured, so no
  // caller may purge ISR pages.
  if (!expectedSecret) {
    return NextResponse.json({ message: 'Revalidation is not configured' }, { status: 401 })
  }
  if (!secret || !secretsMatch(secret, expectedSecret)) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { _type, slug } = body as { _type?: string; slug?: { current?: string } }

    if (_type === 'discoverArticle') {
      revalidatePath('/guides')
      const current = slug?.current
      if (typeof current === 'string' && SLUG_PATTERN.test(current)) {
        revalidatePath(`/guides/${current}`)
      }
    }

    revalidatePath('/destinations')

    return NextResponse.json({ revalidated: true, now: Date.now() })
  } catch {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 })
  }
}
