'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// ─── Data ────────────────────────────────────────────────────────────────────

interface QuizOption {
  label: string
  scores: Record<string, number>
}

interface QuizQuestion {
  emoji: string
  question: string
  options: QuizOption[]
}

interface IslandResult {
  emoji: string
  personality: string
  description: string
  traits: string[]
  image: string
  chatPrompt: string
}

const QUESTIONS: QuizQuestion[] = [
  {
    emoji: '☀️',
    question: "It's Saturday morning. What are you doing?",
    options: [
      { label: 'Brunch at the hottest new spot', scores: { Nassau: 3, 'Harbour Island': 1 } },
      { label: 'Hiking or surfing — something active', scores: { Exuma: 2, Andros: 2 } },
      { label: 'Sleeping in, then beach all day', scores: { 'Harbour Island': 3, 'Long Island': 1 } },
      { label: 'Out on the water fishing or boating', scores: { Bimini: 3, Exuma: 1 } },
    ],
  },
  {
    emoji: '🍽️',
    question: 'Pick your ideal dinner vibe:',
    options: [
      { label: 'Candlelit table, ocean view, cocktails', scores: { 'Harbour Island': 3, Nassau: 1 } },
      { label: 'Street food with the locals, barefoot', scores: { Nassau: 2, 'Long Island': 2 } },
      { label: 'Fresh catch I grilled myself on the beach', scores: { Bimini: 2, Andros: 2 } },
      { label: "A surprise — chef's choice, surprise me", scores: { Exuma: 3, Nassau: 1 } },
    ],
  },
  {
    emoji: '📸',
    question: 'Your dream vacation photo looks like:',
    options: [
      { label: 'Crystal clear water, no one else around', scores: { 'Long Island': 3, Andros: 1 } },
      { label: 'Swimming with wild animals', scores: { Exuma: 3, Bimini: 1 } },
      { label: 'Pink sand with a cocktail in hand', scores: { 'Harbour Island': 3 } },
      { label: 'City lights + beach views', scores: { Nassau: 3 } },
    ],
  },
  {
    emoji: '👥',
    question: 'How do you feel about crowds?',
    options: [
      { label: 'Love the energy — more people, more fun', scores: { Nassau: 3 } },
      { label: 'Small group of friends is perfect', scores: { 'Harbour Island': 2, Exuma: 2 } },
      { label: 'Just me and maybe one person', scores: { 'Long Island': 3, Andros: 1 } },
      { label: "I want to feel like I discovered something", scores: { Andros: 3, 'Long Island': 1 } },
    ],
  },
  {
    emoji: '✨',
    question: 'Pick an emoji that speaks to your soul:',
    options: [
      { label: '🐷 The unexpected adventure', scores: { Exuma: 3 } },
      { label: '🌸 Quiet beauty and elegance', scores: { 'Harbour Island': 3 } },
      { label: '🎣 The great outdoors and open water', scores: { Bimini: 3 } },
      { label: '🤿 Deep exploration and discovery', scores: { Andros: 2, 'Long Island': 2 } },
    ],
  },
]

const ISLAND_RESULTS: Record<string, IslandResult> = {
  Nassau: {
    emoji: '🏝️',
    personality: 'The Social Butterfly',
    description:
      "You love energy, variety, and being where the action is. Nassau's got world-class resorts, buzzing nightlife, Fish Fry on Fridays, and enough culture to keep you exploring for days.",
    traits: ['Nightlife lover', 'Foodie', 'Culture seeker', 'Social'],
    image: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
    chatPrompt: 'Plan me a trip to Nassau in the Bahamas based on my quiz results! I love energy, nightlife, and culture.',
  },
  Exuma: {
    emoji: '🐷',
    personality: 'The Adventure Seeker',
    description:
      "You're all about experiences that make people say \"wait, you did WHAT?\" Swimming pigs, nurse sharks, underwater caves — Exuma is your playground.",
    traits: ['Thrill chaser', 'Photographer', 'Spontaneous', 'Nature lover'],
    image: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg',
    chatPrompt: 'Plan me a trip to Exuma in the Bahamas! I love adventure, wildlife, and unique experiences.',
  },
  'Harbour Island': {
    emoji: '🌸',
    personality: 'The Romantic Soul',
    description:
      "You appreciate beauty, quiet elegance, and moments that take your breath away. Harbour Island's pink sand beach and charming cottages are made for you.",
    traits: ['Romantic', 'Aesthetic', 'Relaxed', 'Luxury-minded'],
    image: 'https://tempo.cdn.tambourine.com/windsong/media/cache/queenshighway-5f525b6953653-1500x643.jpg',
    chatPrompt: 'Plan me a romantic trip to Harbour Island in the Bahamas! I love pink sand, elegance, and peaceful vibes.',
  },
  'Long Island': {
    emoji: '💎',
    personality: 'The Hidden Gem Hunter',
    description:
      "You don't follow the crowd — you find what the crowd hasn't discovered yet. Long Island's Dean's Blue Hole and empty beaches are your kind of paradise.",
    traits: ['Independent', 'Curious', 'Budget-savvy', 'Off the grid'],
    image: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-eleuthera-islands-img-5f7654ecd18bf.jpg',
    chatPrompt: "Plan me a trip to Long Island in the Bahamas! I love hidden gems, diving, and getting off the beaten path.",
  },
  Andros: {
    emoji: '🤿',
    personality: 'The Deep Explorer',
    description:
      "You're drawn to what's beneath the surface — literally. Andros has the third-largest barrier reef on earth, legendary blue holes, and wild untamed nature.",
    traits: ['Diver', 'Eco-conscious', 'Adventurous', 'Introspective'],
    image: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-nassau-islands-img-5f7655231dcf7.jpg',
    chatPrompt: 'Plan me a trip to Andros in the Bahamas! I love diving, reefs, blue holes, and untouched nature.',
  },
  Bimini: {
    emoji: '🎣',
    personality: 'The Ocean Soul',
    description:
      "You belong on the water. Whether it's deep-sea fishing, swimming with dolphins, or just feeling the salt air — Bimini is your happy place.",
    traits: ['Angler', 'Water lover', 'Laid-back', 'Weekend warrior'],
    image: 'https://tempo.cdn.tambourine.com/windsong/media/bmot-exumas-islands-img-5f7654f77ef66.jpg',
    chatPrompt: 'Plan me a trip to Bimini in the Bahamas! I love fishing, the ocean, dolphins, and laid-back island life.',
  },
}

const OPTION_COLORS = [
  { bg: 'bg-brand-500/10 hover:bg-brand-500/20', text: 'text-brand-600', border: 'border-brand-200 hover:border-brand-400' },
  { bg: 'bg-rose-500/10 hover:bg-rose-500/20', text: 'text-rose-600', border: 'border-rose-200 hover:border-rose-400' },
  { bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', text: 'text-emerald-600', border: 'border-emerald-200 hover:border-emerald-400' },
  { bg: 'bg-gold-500/10 hover:bg-gold-500/20', text: 'text-yellow-600', border: 'border-yellow-200 hover:border-yellow-400' },
]

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
          <div className="text-6xl mb-6">🌴</div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">What Bahamas Island Are You?</h1>
          <p className="text-gray-500 mb-10 text-lg leading-relaxed">
            Answer 5 quick questions and we&apos;ll match you to your perfect Bahamian island escape.
          </p>
          <button
            onClick={() => setStep(1)}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-colors shadow-lg shadow-brand-500/25"
          >
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
    const chatUrl = `/dashboard/chat?q=${encodeURIComponent(data.chatPrompt)}`

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
              ✕
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
            <p className="text-white/70 text-base font-medium mb-2">You are…</p>
            <h2 className="text-5xl font-extrabold text-white mb-2 leading-tight">{result}</h2>
            <div className="text-5xl mb-6">{data.emoji}</div>

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
              href={chatUrl}
              className="block w-full bg-white text-brand-600 font-bold py-4 rounded-2xl text-center text-base hover:bg-gray-100 transition-colors shadow-xl"
            >
              Plan my {result} trip with Buddy 🤖
            </Link>
            <Link
              href={`/destinations/${result.toLowerCase().replace(/ /g, '-')}`}
              className="block w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold py-3.5 rounded-2xl text-center text-base hover:bg-white/30 transition-colors"
            >
              Explore {result}
            </Link>
            <button
              onClick={retake}
              className="block w-full text-white/70 text-sm py-2 hover:text-white transition-colors"
            >
              ↩ Take quiz again
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
            ✕
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
            <div className="text-5xl mb-5">{question.emoji}</div>
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
