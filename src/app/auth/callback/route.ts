import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { safeRelativePath } from '@/lib/safe-redirect'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams, origin } = requestUrl
  const code = searchParams.get('code')
  // Prevent open-redirect: only same-origin relative paths are allowed
  // (rejects //host, /\host, scheme URLs and control-character tricks).
  const next = safeRelativePath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const destination = new URL(next, origin)
      // Defence in depth: never leave this origin even if parsing surprises us.
      if (destination.origin !== origin) {
        return NextResponse.redirect(new URL('/dashboard', origin))
      }
      return NextResponse.redirect(destination)
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
