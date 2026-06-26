'use client'

import { useState } from 'react'

export interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
  traveller_type: string | null
}

interface Props {
  faqs: FaqItem[]
}

export default function FaqAccordion({ faqs }: Props) {
  const grouped = new Map<string, FaqItem[]>()
  for (const faq of faqs) {
    const cat = faq.category
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(faq)
  }

  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-3">
            {category}
          </h3>
          <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {items.map(faq => {
              const isOpen = openId === faq.id
              return (
                <button
                  key={faq.id}
                  type="button"
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-300"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-gray-900 leading-snug">
                      {faq.question}
                    </span>
                    <svg
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {isOpen && (
                    <div className="mt-3 pr-7">
                      <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                      {faq.traveller_type && (
                        <span className="mt-2 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-charcoal">
                          {faq.traveller_type}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
