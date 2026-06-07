/**
 * HoursBadge — renders today's opening hours from a google_places.opening_hours array.
 *
 * `opening_hours` in our Supabase schema is a flat array of 7
 * "{Day}: X:XX AM – Y:YY PM" strings (or "{Day}: Closed") — the
 * sync job flattens Google's `weekday_text` into the column. This
 * component picks today's entry by matching the day prefix against
 * the current weekday in America/Nassau time (the Bahamas timezone
 * is the source of truth; the user could be opening the app from
 * any timezone and "Open today" should still mean Bahamas-local).
 *
 * Two modes:
 *   - default (collapsed): today only, single line. Decision-supporting.
 *   - expanded: full 7-day table with today highlighted.
 *
 * Returns null when hours can't be parsed — no fallback to "Unknown".
 * A missing badge reads more cleanly than an inaccurate one.
 *
 * Future: parse the time range and render an "Open now · closes 10pm" /
 * "Closed · opens 8am tomorrow" status — needs careful midnight-rollover
 * and timezone handling. Phase 3 enhancement.
 */

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
] as const

interface Props {
  hours?: string[] | null
  expanded?: boolean
  className?: string
}

/** Determine today's weekday name as Bahamas (America/Nassau) sees it.
 *  Safe in both SSR and CSR — uses Intl which is always available. */
function bahamasWeekday(): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Nassau',
      weekday: 'long',
    }).format(new Date())
  } catch {
    return DAY_NAMES[new Date().getDay()]
  }
}

/** Pull the time portion out of "Monday: 11:00 AM – 12:00 AM". */
function stripDayPrefix(entry: string): string {
  const colonIdx = entry.indexOf(':')
  return colonIdx === -1 ? entry : entry.slice(colonIdx + 1).trim()
}

export function HoursBadge({ hours, expanded = false, className = '' }: Props) {
  if (!Array.isArray(hours) || hours.length === 0) return null

  const today = bahamasWeekday()
  const todayEntry = hours.find(h => h.toLowerCase().startsWith(today.toLowerCase() + ':'))

  if (!todayEntry) return null

  const todayTime = stripDayPrefix(todayEntry)
  const isClosed = /closed/i.test(todayTime)

  if (!expanded) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] ${className}`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        {isClosed ? (
          <span className="text-coral-700 font-semibold">Closed today</span>
        ) : (
          <>
            <span className="text-palm-700 font-semibold">Today</span>
            <span className="text-gray-600">{todayTime}</span>
          </>
        )}
      </span>
    )
  }

  return (
    <div className={`text-[11px] ${className}`}>
      <p className="text-gray-500 font-semibold uppercase tracking-wide text-[10px] mb-1">Hours</p>
      <table className="w-full">
        <tbody>
          {hours.map((entry, i) => {
            const isToday = entry.toLowerCase().startsWith(today.toLowerCase() + ':')
            const dayName = entry.slice(0, entry.indexOf(':')) || `Day ${i + 1}`
            const timePart = stripDayPrefix(entry)
            const closed = /closed/i.test(timePart)
            return (
              <tr key={i} className={isToday ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                <td className="py-0.5 pr-3">{dayName}</td>
                <td className={`py-0.5 text-right ${closed ? 'text-coral-700' : ''}`}>{timePart}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
