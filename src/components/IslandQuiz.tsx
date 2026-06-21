'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BahaImages } from '@/lib/baha-images'
import { buddyChatHref } from '@/lib/buddy-chat'

// ─── Data ────────────────────────────────────────────────────────────────────

interface QuizOption {
  label: string
  scores: Record<string, number>
}

interface QuizQuestion {
  question: string
  options: QuizOption[]
}

interface IslandResult {
  personality: string
  description: string
  traits: string[]
  image: string
  chatPrompt: string
  islandSlug: string
}

const QUESTIONS: QuizQuestion[] = [
  {
    question: "It's Saturday morning. What are you doing?",
    options: [
      { label: 'Brunch at the hottest new spot', scores: { Nassau: 3, 'Harbour Island': 1 } },
      { label: 'Hiking or surfing — something active', scores: { Exuma: 2, Andros: 2 } },
      { label: 'Sleeping in, then beach all day', scores: { 'Harbour Island': 3, 'Long Island': 1 } },
      { label: 'Out on the water fishing or boating', scores: { Bimini: 3, Exuma: 1 } },
    ],
  },
  {
    question: 'Pick your ideal dinner vibe:',
    options: [
      { label: 'Candlelit table, ocean view, cocktails', scores: { 'Harbour Island': 3, Nassau: 1 } },
      { label: 'Street food with the locals, barefoot', scores: { Nassau: 2, 'Long Island': 2 } },
      { label: 'Fresh catch I grilled myself on the beach', scores: { Bimini: 2, Andros: 2 } },
      { label: "A surprise — chef's choice, surprise me", scores: { Exuma: 3, Nassau: 1 } },
    ],
  },
  {
    question: 'Your dream vacation photo looks like:',
    options: [
      { label: 'Crystal clear water, no one else around', scores: { 'Long Island': 3, Andros: 1 } },
      { label: 'Swimming with wild animals', scores: { Exuma: 3, Bimini: 1 } },
      { label: 'Pink sand with a cocktail in hand', scores: { 'Harbour Island': 3 } },
      { label: 'City lights + beach views', scores: { Nassau: 3 } },
    ],
  },
  {
    question: 'How do you feel about crowds?',
    options: [
      { label: 'Love the energy — more people, more fun', scores: { Nassau: 3 } },
      { label: 'Small group of friends is perfect', scores: { 'Harbour Island': 2, Exuma: 2 } },
      { label: 'Just me and maybe one person', scores: { 'Long Island': 3, Andros: 1 } },
      { label: "I want to feel like I discovered something", scores: { Andros: 3, 'Long Island': 1 } },
    ],
  },
  {
    question: 'What speaks to your soul?',
    options: [
      { label: 'The unexpected adventure', scores: { Exuma: 3 } },
      { label: 'Quiet beauty and elegance', scores: { 'Harbour Island': 3 } },
      { label: 'The great outdoors and open water', scores: { Bimini: 3 } },
      { label: 'Deep exploration and discovery', scores: { Andros: 2, 'Long Island': 2 } },
    ],
  },
]

const ISLAND_RESULTS: Record<string, IslandResult> = {
  Nassau: {
    personality: 'The Social Butterfly',
    description:
      "You love energy, variety, and being where the action is. Nassau's got world-class resorts, buzzing nightlife, Fish Fry on Fridays, and enough culture to keep you exploring for days.",
    traits: ['Nightlife lover', 'Foodie', 'Culture seeker', 'Social'],
    image: BahaImages.nassau,
    chatPrompt: 'Plan me a trip to Nassau in the Bahamas based on my quiz results! I love energy, nightlife, and culture.',
    islandSlug: 'nassau-paradise-island',
  },
  Exuma: {
    personality: 'The Adventure Seeker',
    description:
      "You're all about experiences that make people say \"wait, you did WHAT?\" Swimming pigs, nurse sharks, underwater caves — Exuma is your playground.",
    traits: ['Thrill chaser', 'Photographer', 'Spontaneous', 'Nature lover'],
    image: BahaImages.exumas,
    chatPrompt: 'Plan me a trip to Exuma in the Bahamas! I love adventure, wildlife, and unique experiences.',
    islandSlug: 'the-exumas',
  },
  'Harbour Island': {
    personality: 'The Romantic Soul',
    description:
      "You appreciate beauty, quiet elegance, and moments that take your breath away. Harbour Island's pink sand beach and charming cottages are made for you.",
    traits: ['Romantic', 'Aesthetic', 'Relaxed', 'Luxury-minded'],
    image: BahaImages.bahamasLifestyle,
    chatPrompt: 'Plan me a romantic trip to Harbour Island in the Bahamas! I love pink sand, elegance, and peaceful vibes.',
    islandSlug: 'harbour-island',
  },
  'Long Island': {
    personality: 'The Hidden Gem Hunter',
    description:
      "You don't follow the crowd — you find what the crowd hasn't discovered yet. Long Island's Dean's Blue Hole and empty beaches are your kind of paradise.",
    traits: ['Independent', 'Curious', 'Budget-savvy', 'Off the grid'],
    image: BahaImages.eleuthera,
    chatPrompt: "Plan me a trip to Long Island in the Bahamas! I love hidden gems, diving, and getting off the beaten path.",
    islandSlug: 'long-island',
  },
  Andros: {
    personality: 'The Deep Explorer',
    description:
      "You're drawn to what's beneath the surface — literally. Andros has the third-largest barrier reef on earth, legendary blue holes, and wild untamed nature.",
    traits: ['Diver', 'Eco-conscious', 'Adventurous', 'Introspective'],
    image: BahaImages.nassau,
    chatPrompt: 'Plan me a trip to Andros in the Bahamas! I love diving, reefs, blue holes, and untouched nature.',
    islandSlug: 'andros',
  },
  Bimini: {
    personality: 'The Ocean Soul',
    description:
      "You belong on the water. Whether it's deep-sea fishing, swimming with dolphins, or just feeling the salt air — Bimini is your happy place.",
    traits: ['Angler', 'Water lover', 'Laid-back', 'Weekend warrior'],
    image: BahaImages.exumas,
    chatPrompt: 'Plan me a trip to Bimini in the Bahamas! I love fishing, the ocean, dolphins, and laid-back island life.',
    islandSlug: 'bimini',
  },
}

const OPTION_COLORS = [
  { bg: 'bg-brand-500/10 hover:bg-brand-500/20', text: 'text-brand-600', border: 'border-brand-200 hover:border-brand-400' },
  { bg: 'bg-rose-500/10 hover:bg-rose-500/20', text: 'text-rose-600', border: 'border-rose-200 hover:border-rose-400' },
  { bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', text: 'text-emerald-600', border: 'border-emerald-200 hover:border-emerald-400' },
  { bg: 'bg-gold-500/10 hover:bg-gold-500/20', text: 'text-gold-700', border: 'border-gold-200 hover:border-gold-400' },
]

function islandQuizTripHref(result: string, data: IslandResult): string {
  const params = new URLSearchParams()
  params.set('returnTo', '/explore/quiz')
  params.set('source', 'island_quiz')
  params.set('destination', data.islandSlug)
  params.set('seed', data.chatPrompt)
  params.set('result', result)
  return `/dashboard/trips/new?${params.toString()}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function IslandQuiz() {
  const [step, setStep] = useState(0) // 0 = intro, 1-5 = questions, 6 = result
  const [scores, setScores] = useState<Record<string, number>>({
    Nassau: 0,
    Exuma: 0,
    'Harbour Island': 0,
    'Long Island': 0,
    Andros: 0,
    Bimini: 0,
  })
  const [result, setResult] = useState<string | null>(null)

  const currentQuestionIndex = step - 1
  const question = step >= 1 && step <= 5 ? QUESTIONS[currentQuestionIndex] : null
  const progress = step <= 5 ? step / QUESTIONS.length : 1

  function selectOption(option: QuizOption) {
    const newScores = { ...scores }
    for (const [island, pts] of Object.entries(option.scores)) {
      newScores[island] = (newScores[island] ?? 0) + pts
    }
    setScores(newScores)

    if (step < QUESTIONS.length) {
      setStep(step + 1)
    } else {
      const sorted = Object.entries(newScores).sort((a, b) => b[1] - a[1])
      setResult(sorted[0][0])
      setStep(6)
    }
  }

  function retake() {
    setStep(1)
    setScores({ Nassau: 0, Exuma: 0, 'Harbour Island': 0, 'Long Island': 0, Andros: 0, Bimini: 0 })
    setResult(null)
  }

  // ── Intro ──
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">What Bahamas Island Are You?</h1>
          <p className="text-gray-500 mb-10 text-lg leading-relaxed">
            Answer 5 quick questions and we&apos;ll match you to your perfect Bahamian island escape.
          </p>
          <button
            onClick={() => setStep(1)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700"
          >
            <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
            Start the Quiz
          </button>
          <p className="text-sm text-gray-400 mt-4">Takes about 1 minute · Free</p>
        </div>
      </div>
    )
  }

  // ── Result ──
  if (step === 6 && result) {
    const data = ISLAND_RESULTS[result] ?? ISLAND_RESULTS['Nassau']
    const startTripHref = islandQuizTripHref(result, data)
    const exploreHref = `/explore/island/${data.islandSlug}`
    const askBuddyHref = buddyChatHref(data.chatPrompt)

    return (
      <div className="min-h-screen bg-gray-900 relative overflow-hidden">
        {/* Hero image */}
        <div className="absolute inset-0">
          <Image
            src={data.image}
            alt={result}
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/80" />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col px-4 py-8">
          {/* Top bar */}
          <div className="flex items-center justify-between max-w-lg mx-auto w-full">
            <Link
              href="/explore/quiz"
              onClick={retake}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </Link>
            <button
              onClick={retake}
              className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              Retake
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full text-center py-8">
            <p className="text-white/70 text-base font-medium mb-2">Your island match</p>
            <h2 className="text-5xl font-extrabold text-white mb-2 leading-tight">{result}</h2>

            {/* Info card */}
            <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-3xl p-6 mb-6 text-left">
              <p className="text-white font-semibold text-lg text-center mb-3">{data.personality}</p>
              <p className="text-white/85 text-sm leading-relaxed text-center">{data.description}</p>
            </div>

            {/* Traits */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {data.traits.map((trait) => (
                <span
                  key={trait}
                  className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="max-w-lg mx-auto w-full space-y-3">
            <Link
              href={startTripHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-center text-base font-bold text-white shadow-xl transition-colors hover:bg-brand-700"
            >
              <span className="h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
              Start my {result} trip
            </Link>
            <Link
              href={exploreHref}
              className="block w-full rounded-2xl border border-white/30 bg-white/20 py-3.5 text-center text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              Explore {result}
            </Link>
            <Link
              href={askBuddyHref}
              className="block w-full rounded-2xl border border-white/25 bg-white/10 py-3 text-center text-sm font-semibold text-white/85 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
            >
              Ask Buddy about this match
            </Link>
            <button
              onClick={retake}
              className="block w-full text-white/70 text-sm py-2 hover:text-white transition-colors"
            >
              Take quiz again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz question ──
  if (!question) return null

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#F8FAFB]/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Link
            href="/explore/quiz"
            onClick={retake}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
            aria-label="Back to intro"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </Link>
          <div className="flex-1">
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-gray-400 font-medium whitespace-nowrap">
            {step} of {QUESTIONS.length}
          </span>
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 flex flex-col px-4 py-8">
        <div className="max-w-lg mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 leading-snug">{question.question}</h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, i) => {
              const colors = OPTION_COLORS[i % OPTION_COLORS.length]
              const letter = String.fromCharCode(65 + i) // A, B, C, D
              return (
                <button
                  key={option.label}
                  onClick={() => selectOption(option)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border bg-white ${colors.border} text-left transition-all duration-150 hover:shadow-md active:scale-[0.99] cursor-pointer`}
                >
                  <div
                    className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm ${colors.bg} ${colors.text}`}
                  >
                    {letter}
                  </div>
                  <span className="text-gray-800 font-medium text-base leading-snug">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
