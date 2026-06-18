import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const protectedPaths = ['/dashboard', '/trip', '/profile']
  const isFlightBookingRoute =
    /^\/flights\/[^/]+\/book(?:\/|$)/.test(request.nextUrl.pathname)
  const isProtected =
    protectedPaths.some(p => request.nextUrl.pathname.startsWith(p)) ||
    isFlightBookingRoute

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
