/**
 * Cookie that remembers the vendor portal's active partner so the vendor
 * layout (which cannot read searchParams) renders the same partner as the
 * page. Set by middleware whenever a /vendor route carries ?partner_id=.
 * The value is only a preference: it is always re-checked against the
 * signed-in user's active memberships before use.
 */
export const VENDOR_PARTNER_COOKIE = 'bb_vendor_partner_id'

export const VENDOR_PARTNER_ID_PATTERN = /^[A-Za-z0-9-]{1,80}$/
