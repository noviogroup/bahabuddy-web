import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export function isGuestChatPath(pathname: string): boolean {
  return pathname === '/dashboard/chat'
}

export function isProtectedRoutePath(pathname: string): boolean {
  const protectedPaths = ['/dashboard', '/trip', '/profile']
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

  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = isProtectedRoutePath(request.nextUrl.pathname)

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    const fullPath = request.nextUrl.pathname + (request.nextUrl.search || '')
    loginUrl.searchParams.set('redirect', fullPath)
    return NextResponse.redirect(loginUrl)
  }

  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/trip/:path*',
    '/profile/:path*',
    '/profile',
    '/flights/:path*',
    '/flights',
    '/login',
  ],
}
