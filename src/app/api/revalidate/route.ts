import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sanity-webhook-secret')
  const expectedSecret = process.env.SANITY_REVALIDATE_SECRET

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { _type, slug } = body as { _type?: string; slug?: { current?: string } }

    if (_type === 'discoverArticle') {
      revalidatePath('/guides')
      if (slug?.current) {
        revalidatePath(`/guides/${slug.current}`)
      }
    }

    revalidatePath('/destinations')

    return NextResponse.json({ revalidated: true, now: Date.now() })
  } catch {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 })
  }
}
