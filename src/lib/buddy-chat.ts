const MAX_BUDDY_PROMPT_LENGTH = 600

export function cleanBuddyPrompt(prompt: string | null | undefined): string {
  return (prompt ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_BUDDY_PROMPT_LENGTH)
}

export function buddyChatHref(
  prompt: string | null | undefined,
  extraParams: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const params = new URLSearchParams()
  const cleanPrompt = cleanBuddyPrompt(prompt)
  if (cleanPrompt) params.set('q', cleanPrompt)

  for (const [key, value] of Object.entries(extraParams)) {
    if (value === null || value === undefined || value === '') continue
    params.set(key, String(value))
  }

  const qs = params.toString()
  return qs ? `/dashboard/chat?${qs}` : '/dashboard/chat'
}
