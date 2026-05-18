import { format, parseISO, startOfDay } from 'date-fns'

/** Parse YYYY-MM-DD to local midnight (avoids UTC shift). */
export function isoToDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

/** Format Date as YYYY-MM-DD in local time. */
export function dateToIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayIso(): string {
  return dateToIso(new Date())
}

export function startOfToday(): Date {
  return startOfDay(new Date())
}

/** Nights between two ISO dates (end − start in days). */
export function nightsBetween(start: string, end: string): number | null {
  const s = isoToDate(start)
  const e = isoToDate(end)
  if (!s || !e) return null
  const diff = Math.round((e.getTime() - s.getTime()) / 86_400_000)
  return diff > 0 ? diff : null
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return format(parseISO(iso), 'MMM d')
  } catch {
    return iso
  }
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return format(parseISO(iso), 'EEE, MMM d, yyyy')
  } catch {
    return iso
  }
}

/** Airbnb-style trigger label for a range. */
export function formatRangeLabel(start: string, end: string, placeholder = 'Add dates'): string {
  if (start && end) {
    if (start === end) return formatDateShort(start)
    return `${formatDateShort(start)} – ${formatDateShort(end)}`
  }
  if (start) return `${formatDateShort(start)} – End date`
  return placeholder
}

export function clampEndAfterStart(start: string, end: string): string {
  if (!start || !end) return end
  return end < start ? start : end
}
