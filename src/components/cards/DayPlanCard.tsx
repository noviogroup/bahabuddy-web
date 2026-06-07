'use client'

/**
 * DayPlanCard — vertical day-by-day itinerary card.
 *
 * Phase 3 redesign vs the old inline version:
 *
 *   - Time-of-day icon column. Each slot leads with a colored icon disc
 *     (sunrise / sun / moon) that gives the eye a vertical scan path
 *     down the day. Pretty AND useful — the user can spot "missing
 *     evening" at a glance instead of reading three labels.
 *
 *   - Pace badge in the header. Relaxed (\u22641 activity), Moderate (2),
 *     Packed (3). Communicates the *shape* of the day, not just its
 *     contents \u2014 helps the user feel whether the day matches their style
 *     before they read any activity text.
 *
 *   - Date display when known. Sundays read differently than weekdays;
 *     showing "Day 3 \u00b7 Saturday Jun 14" is a much stronger anchor than
 *     "Day 3" alone.
 *
 *   - Day-total footer when cost data is available. Stops the user from
 *     having to mentally tally activities to know if a day is overweight.
 *
 *   - Optional Swap affordance per slot. When `onSendMessage` is wired,
 *     each slot gets a quiet "Swap" pill that sends a chat message
 *     asking Buddy to find an alternative. Chat-native edit loop.
 *
 * Plain CardShell mode \u2014 no detail page, no expand.
 */

import { CardShell } from './shared'
import type { MouseEvent } from 'react'

// \u2500\u2500\u2500 Types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export interface DayPlanCardData {
  day_number?: number
  /** Free-form date label. "Saturday Jun 14" or "2026-06-14" \u2014 we render as-is. */
  day_date?: string
  morning?: string
  afternoon?: string
  evening?: string
  /** Sum cost for activities/meals/transport on this day. Optional. */
  day_total_cost?: number
  /** Pace heuristic. Computed from filled-slot count when absent. */
  day_pace?: 'relaxed' | 'moderate' | 'packed'
}

interface Props {
  data: DayPlanCardData
  /** When set, each slot renders a Swap pill that calls this with a
   *  contextual prompt. Used in chat to keep editing inline. */
  onSendMessage?: (msg: string) => void
  className?: string
}

// \u2500\u2500\u2500 Icons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const ICONS = {
  morning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  ),
  afternoon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
    </svg>
  ),
  evening: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
}

// \u2500\u2500\u2500 Slot config \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

interface SlotConfig {
  key: 'morning' | 'afternoon' | 'evening'
  label: string
  /** Disc background + icon color */
  discBg: string
  discText: string
  /** Slot card background + border */
  slotBg: string
}

const SLOTS: SlotConfig[] = [
  { key: 'morning',   label: 'Morning',   discBg: 'bg-gold-100',  discText: 'text-gold-700',  slotBg: 'bg-gold-50/60'  },
  { key: 'afternoon', label: 'Afternoon', discBg: 'bg-brand-100', discText: 'text-brand-700', slotBg: 'bg-brand-50/60' },
  { key: 'evening',   label: 'Evening',   discBg: 'bg-night/10',  discText: 'text-night',     slotBg: 'bg-sand-100/60' },
]

// \u2500\u2500\u2500 Pace badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function paceFromActivities(filled: number): 'relaxed' | 'moderate' | 'packed' {
  if (filled <= 1) return 'relaxed'
  if (filled === 2) return 'moderate'
  return 'packed'
}

const PACE_STYLES: Record<'relaxed' | 'moderate' | 'packed', { bg: string; text: string }> = {
  relaxed:  { bg: 'bg-palm-100',  text: 'text-palm-700' },
  moderate: { bg: 'bg-brand-100', text: 'text-brand-700' },
  packed:   { bg: 'bg-coral-100', text: 'text-coral-700' },
}

// \u2500\u2500\u2500 Component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export function DayPlanCard({ data, onSendMessage, className }: Props) {
  const { day_number = 1, day_date, day_total_cost } = data
  const slots = SLOTS.map(cfg => ({
    ...cfg,
    activity: data[cfg.key] ?? '',
  }))
  const filled = slots.filter(s => s.activity).length
  const pace = data.day_pace ?? paceFromActivities(filled)
  const paceStyle = PACE_STYLES[pace]

  const stop = (e: MouseEvent<HTMLButtonElement>) => e.stopPropagation()

  return (
    <CardShell mode="plain" className={className}>
      {/* Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="flex items-center justify-between gap-3 bg-brand-600 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-bold text-sm">Day {day_number}</span>
          {day_date && (
            <>
              <span className="text-brand-200 text-sm" aria-hidden="true">\u00b7</span>
              <span className="text-brand-100 text-xs truncate">{day_date}</span>
            </>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${paceStyle.bg} ${paceStyle.text}`}>
          {pace}
        </span>
      </div>

      {/* Slots \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="p-3 space-y-2">
        {slots.map(s => (
          <div key={s.key} className={`flex items-start gap-3 rounded-xl p-2.5 ${s.activity ? s.slotBg : 'bg-gray-50/60 border border-dashed border-gray-200'}`}>
            <div className={`w-8 h-8 rounded-full ${s.discBg} ${s.discText} flex items-center justify-center shrink-0`}>
              {ICONS[s.key]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{s.label}</p>
              {s.activity ? (
                <p className="text-sm text-gray-800 leading-snug mt-0.5">{s.activity}</p>
              ) : (
                <p className="text-sm text-gray-400 italic mt-0.5">Open slot</p>
              )}
            </div>
            {onSendMessage && s.activity && (
              <button
                type="button"
                onClick={(e) => {
                  stop(e)
                  onSendMessage(`Swap the ${s.label.toLowerCase()} activity on Day ${day_number}`)
                }}
                className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-full hover:bg-brand-50 transition-colors shrink-0"
                aria-label={`Swap ${s.label.toLowerCase()} activity on day ${day_number}`}
              >
                Swap
              </button>
            )}
            {onSendMessage && !s.activity && (
              <button
                type="button"
                onClick={(e) => {
                  stop(e)
                  onSendMessage(`Suggest something for ${s.label.toLowerCase()} on Day ${day_number}`)
                }}
                className="text-[10px] font-semibold text-gray-500 hover:text-brand-600 px-2 py-1 rounded-full hover:bg-brand-50 transition-colors shrink-0"
              >
                Add
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Day total footer (when known) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      {day_total_cost && day_total_cost > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Day total</span>
          <span className="text-base font-bold text-brand-600">${Math.round(day_total_cost).toLocaleString()}</span>
        </div>
      )}
    </CardShell>
  )
}
