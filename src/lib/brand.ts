/** Canonical brand assets in /public/brand (served from public/) */
export const BUDDY_AVATAR_SRC = '/brand/buddy-avatar.png'
/** Full-color wordmark + icon — public/brand/logo.png */
export const LOGO_SRC = '/brand/logo.png'
/** Native pixel dimensions of logo.png — keep in sync if the asset is replaced. */
export const LOGO_INTRINSIC = { width: 1354, height: 1398 } as const
/** Transparent logo mark for UI chrome — no backing square, border, or gradient plate. */
export const LOGO_MARK_SRC = '/brand/baha-logo-mark.svg'
export const LOGO_MARK_INTRINSIC = { width: 64, height: 64 } as const

/**
 * App store listing URLs. The apps are not listed yet, so these come from
 * env (`NEXT_PUBLIC_APP_STORE_URL`, e.g. https://apps.apple.com/app/baha-buddy/id<APP_ID>,
 * and `NEXT_PUBLIC_GOOGLE_PLAY_URL`). While unset they are null and store
 * badges are not rendered, so no CTA points at a not-found listing.
 */
export const APP_STORE_URL: string | null = storeUrl(process.env.NEXT_PUBLIC_APP_STORE_URL)
export const GOOGLE_PLAY_URL: string | null = storeUrl(process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL)

function storeUrl(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed && /^https:\/\//.test(trimmed) ? trimmed : null
}

/** Official store badges (Wikimedia Commons, high-res PNG exports of SVG badges). */
export const APP_STORE_BADGE_SRC =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Download_on_the_App_Store_Badge.svg/3840px-Download_on_the_App_Store_Badge.svg.png'
export const GOOGLE_PLAY_BADGE_SRC =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/3840px-Google_Play_Store_badge_EN.svg.png'

/** Intrinsic badge proportions for next/image (≈3:1 at standard marketing size). */
export const APP_STORE_BADGE_INTRINSIC = { width: 180, height: 60 } as const
export const GOOGLE_PLAY_BADGE_INTRINSIC = { width: 180, height: 53 } as const
