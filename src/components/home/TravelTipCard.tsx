/**
 * TravelTipCard — rotating editorial travel tip.
 *
 * Mobile reference: TravelTipCard in lib/features/home/widgets/home_sections.dart
 *
 * Wiring:
 *   - C.7 (March 2026): pulled from a placeholder `travelTip` document
 *     type with categories `practical | cultural | seasonal`.
 *   - Session 13 (May 2026): switched to the canonical Studio `tip`
 *     type, which has 8 categories (local_knowledge, safety,
 *     money_budget, getting_around, food_drink, culture_etiquette,
 *     weather, packing). The 8 → 3 mapping lives in `types.ts` as
 *     `TIP_CATEGORY_TONE` so editors don't have to think about UI
 *     buckets — they pick a content category, the card picks the
 *     visual tone.
 *
 * Fallback: 8 hardcoded tips when Sanity is unconfigured. Day-of-year
 * rotation preserved — every user sees the same tip on the same day.
 *
 * Server component (async — Sanity fetch).
 */

import { fetchTips } from '@/lib/sanity/queries'
import { TIP_CATEGORY_TONE, type TipTone } from '@/lib/sanity/types'

interface Tip {
  category: TipTone
  title: string
  body: string
}

const FALLBACK_TIPS: Tip[] = [
  { category: 'practical', title: 'Book flights 6–8 weeks out',
    body: 'Sweet spot for the Bahamas — close enough to know weather, far enough to dodge peak pricing.' },
  { category: 'cultural', title: 'Junkanoo runs Dec 26 + Jan 1',
    body: 'The country shuts down to celebrate. Plan around it or, better — plan into it.' },
  { category: 'seasonal', title: 'May–June is the secret window',
    body: "Weather still warm, prices have dropped, hurricane season hasn't started. Locals' favorite months." },
  { category: 'practical', title: 'Pack reef-safe sunscreen only',
    body: 'Many islands now enforce reef-safe-only rules. Pick a mineral-based brand before you fly.' },
  { category: 'cultural', title: 'Tip culture',
    body: "Most resorts add gratuity automatically. Check your bill before tipping again — it's usually 15%." },
  { category: 'seasonal', title: 'Hurricane season runs Jun–Nov',
    body: 'August through October are peak — most travelers find perfect weather, but always book a refundable rate.' },
  { category: 'practical', title: 'Domestic flights book up fast',
    body: 'Inter-island Bahamas Air flights (NAS→GGT, NAS→ELH) sell out 2–3 weeks ahead during high season.' },
  { category: 'cultural', title: 'Conch salad is a religion',
    body: "Try it made-to-order at a local stand. The vendor chops the conch in front of you — that's the right way." },
]

function dayIndex(): number {
  const today = new Date()
  const start = new Date(today.getFullYear(), 0, 0)
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000)
}

const TONE_STYLE: Record<TipTone, { fill: string; text: string; label: string }> = {
  practical: { fill: 'bg-brand-50',  text: 'text-brand-700',  label: 'PRACTICAL' },
  cultural:  { fill: 'bg-coral-50',  text: 'text-coral-700',  label: 'CULTURAL' },
  seasonal:  { fill: 'bg-palm-50',   text: 'text-palm-700',   label: 'SEASONAL' },
}

export default async function TravelTipCard() {
  const sanityTips = await fetchTips()

  const tips: Tip[] =
    sanityTips && sanityTips.length > 0
      ? sanityTips.map(t => ({
          // Sanity tip body is required + length-capped; title is required.
          title: t.title,
          body: t.body,
          // Map Studio's 8 categories → 3 visual tones. Default to
          // 'practical' if the category is missing (Studio doesn't
          // strictly require it, even though the UI does).
          category: t.category ? TIP_CATEGORY_TONE[t.category] : 'practical',
        }))
      : FALLBACK_TIPS

  const tip = tips[dayIndex() % tips.length]
  const tone = TONE_STYLE[tip.category]

  return (
    <section className="px-5 md:px-6">
      <div className="bg-white rounded-baha-lg shadow-soft p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-block text-xs font-boldst uppercase px-2 py-1 rounded ${tone.fill} ${tone.text}`}>
            {tone.label}
          </span>
          <span className="text-xs text-gray-400">Travel tip</span>
        </div>
        <h3 className="text-base font-bold text-night mb-1.5">{tip.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{tip.body}</p>
      </div>
    </section>
  )
}
