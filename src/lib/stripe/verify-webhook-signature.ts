import crypto from 'crypto'

const WEBHOOK_TOLERANCE_SECONDS = 300

export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false

  const parts = signatureHeader.split(',').reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split('=')
    if (key && value) {
      acc[key] = acc[key] ?? []
      acc[key].push(value)
    }
    return acc
  }, {})

  const timestamp = parts.t?.[0]
  const signatures = parts.v1 ?? []
  if (!timestamp || signatures.length === 0) return false

  const age = Math.floor(Date.now() / 1000) - Number(timestamp)
  if (Number.isNaN(age) || age > WEBHOOK_TOLERANCE_SECONDS) return false

  const signedPayload = `${timestamp}.${payload}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  const expectedBuffer = Buffer.from(expected, 'utf8')

  return signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, 'utf8')
    if (signatureBuffer.length !== expectedBuffer.length) return false

    try {
      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    } catch {
      return false
    }
  })
}
