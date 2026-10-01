import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PATHNAME_HEADER } from '@/lib/safe-redirect'
import { VENDOR_PARTNER_COOKIE, VENDOR_PARTNER_ID_PATTERN } from '@/lib/vendor-partner-cookie'

export function isGuestChatPath(pathname: string): boolean {
  return pathname === '/dashboard/chat'
}

export function isProtectedRoutePath(pathname: string): boolean {
  // /activities and /checkout live inside the (dashboard) auth layout; listing
  // them here only makes the redirect keep the ?redirect= return path.
  const protectedPaths = ['/dashboard', '/trip', '/profile', '/vendor', '/activities', '/checkout']
  const isFlightBookingRoute = /^\/flights\/[^/]+\/book(?:\/|$)/.test(pathname)

  return (
    (!isGuestChatPath(pathname) &&
      !getPublicShareCodeFromTripPath(pathname) &&
      protectedPaths.some(p => pathname.startsWith(p))) ||
    isFlightBookingRoute
  )
}

export function getPublicShareCodeFromTripPath(pathname: string): string | null {
  const match = pathname.match(/^\/trip\/([^/]+)\/?$/)
  if (!match) return null

  const segment = match[1]
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidPattern.test(segment) ? null : segment
}

export async function middleware(request: NextRequest) {
  const publicShareCode = getPublicShareCodeFromTripPath(request.nextUrl.pathname)
  if (publicShareCode) {
    const shareUrl = new URL(`/share/${encodeURIComponent(publicShareCode)}`, request.url)
    shareUrl.search = request.nextUrl.search
    return NextResponse.redirect(shareUrl)
  }

  const pathname = request.nextUrl.pathname

  // Keep the vendor shell (layout) and the page on the same partner: an
  // explicit ?partner_id= on a vendor route becomes the remembered partner.
  const requestedVendorPartner = pathname === '/vendor' || pathname.startsWith('/vendor/')
    ? request.nextUrl.searchParams.get('partner_id')
    : null
  const vendorPartnerId = requestedVendorPartner && VENDOR_PARTNER_ID_PATTERN.test(requestedVendorPartner)
    ? requestedVendorPartner
    : null
  if (vendorPartnerId) request.cookies.set(VENDOR_PARTNER_COOKIE, vendorPartnerId)

  // Rebuild the forwarded request headers each time so cookie updates made by
  // Supabase's setAll (which rewrite the request cookie header) are kept.
  const nextResponse = () => {
    const headers = new Headers(request.headers)
    headers.set(PATHNAME_HEADER, pathname + (request.nextUrl.search || ''))
    const response = NextResponse.next({ request: { headers } })
    if (vendorPartnerId) {
      response.cookies.set(VENDOR_PARTNER_COOKIE, vendorPartnerId, {
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: request.nextUrl.protocol === 'https:',
        maxAge: 60 * 60 * 24 * 30,
      })
    }
    return response
  }

  let supabaseResponse = nextResponse()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = nextResponse()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = isProtectedRoutePath(pathname)

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    const fullPath = request.nextUrl.pathname + (request.nextUrl.search || '')
    loginUrl.searchParams.set('redirect', fullPath)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Run on every page so Supabase can persist rotated session cookies (Server
  // Components cannot write cookies). Excluded: Next internals, image
  // optimizer, API routes (route handlers set their own cookies, and webhooks
  // must not pay for a session lookup) and static files.
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest|js|css|map|woff2?|ttf|mp4|riv|json)$).*)',
  ],
}
