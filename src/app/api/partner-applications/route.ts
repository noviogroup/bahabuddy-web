import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const businessName = clean(body.businessName)
    const category = clean(body.category)

    if (!businessName || !category) {
      return NextResponse.json({ error: 'Business name and category are required.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 2000) : ''
}
