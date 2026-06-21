const CUSTOMER_FACING_EMOJI_PATTERN =
  /(?:[\u2600-\u27BF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDEFF]|[\uFE0E\uFE0F\u200D])/g

export function stripCustomerFacingEmoji(value: string): string {
  return value.replace(CUSTOMER_FACING_EMOJI_PATTERN, '')
}
