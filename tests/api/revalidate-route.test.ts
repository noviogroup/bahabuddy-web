import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { POST } from '@/app/api/revalidate/route'

function request(body: unknown, secret?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secret !== undefined) headers['x-sanity-webhook-secret'] = secret
  return new NextRequest('http://localhost.test/api/revalidate', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/revalidate', () => {
  const original = process.env.SANITY_REVALIDATE_SECRET

  beforeEach(() => {
    mocks.revalidatePath.mockReset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SANITY_REVALIDATE_SECRET
    else process.env.SANITY_REVALIDATE_SECRET = original
  })

  test('fails closed when the secret is not configured', async () => {
    delete process.env.SANITY_REVALIDATE_SECRET
    const response = await POST(request({ _type: 'discoverArticle', slug: { current: 'x' } }))
    expect(response.status).toBe(401)
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  test('rejects a missing or wrong secret', async () => {
    process.env.SANITY_REVALIDATE_SECRET = 'correct-secret'
    expect((await POST(request({}, undefined))).status).toBe(401)
    expect((await POST(request({}, 'wrong'))).status).toBe(401)
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  test('revalidates guides for a valid secret and only well-formed slugs', async () => {
    process.env.SANITY_REVALIDATE_SECRET = 'correct-secret'
    const ok = await POST(request({ _type: 'discoverArticle', slug: { current: 'best-beaches' } }, 'correct-secret'))
    expect(ok.status).toBe(200)
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/guides/best-beaches')

    mocks.revalidatePath.mockReset()
    await POST(request({ _type: 'discoverArticle', slug: { current: '../../dashboard' } }, 'correct-secret'))
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/guides')
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith('/guides/../../dashboard')
  })
})
