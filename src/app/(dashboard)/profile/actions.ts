'use server'

/**
 * Server actions for the profile page.
 *
 * Server actions run on the server in response to form submissions.
 * They have access to Supabase server client (auth-aware) and can
 * revalidate paths/tags after mutation.
 *
 * Why server actions vs an API route:
 *   - No need to define a separate /api/* endpoint
 *   - Built-in CSRF protection
 *   - revalidatePath() integrates with the React Server Component cache
 *
 * Mobile reference: the profile screen calls Supabase directly from the
 * Flutter client. Web routes the update through this server action so
 * the user's auth cookie does the heavy lifting (no manual JWT plumbing).
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface UpdateProfileInput {
  display_name: string
  city: string
  country: string
  party_type: string
  party_size: number
  children_count: number
  interest_tags: string[]
}

export interface UpdateProfileResult {
  success: boolean
  error?: string
}

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  // Basic validation — server-side guard so a malicious client can't
  // bypass the form-level checks.
  if (!input.display_name || input.display_name.length > 80) {
    return { success: false, error: 'Display name must be 1–80 characters.' }
  }
  if (input.party_size < 1 || input.party_size > 20) {
    return { success: false, error: 'Party size must be between 1 and 20.' }
  }
  if (input.children_count < 0 || input.children_count > 10) {
    return { success: false, error: 'Children count must be between 0 and 10.' }
  }
  if (!Array.isArray(input.interest_tags)) {
    return { success: false, error: 'Invalid interests payload.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated.' }

  const { error } = await supabase
    .from('users')
    .update({
      display_name:   input.display_name.trim(),
      city:           input.city.trim() || null,
      country:        input.country.trim() || null,
      party_type:     input.party_type,
      party_size:     input.party_size,
      children_count: input.children_count,
      interest_tags:  input.interest_tags,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('updateProfile error:', error)
    return { success: false, error: error.message }
  }

  // Bust caches for any page that reads the user's profile.
  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true }
}
