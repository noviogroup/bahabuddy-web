'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BahaDateRangePicker } from '@/components/ui'
import {
  TravelSearchField,
  TravelSearchInput,
  TravelSearchSelect,
  TravelSearchTextarea,
} from '@/components/marketplace/TravelSearchFields'

interface Attraction {
  id: string
  name: string
  category: string
  island: string | null
  description: string
}

interface ActivityItem {
  id: string // local-only uuid for list key
  dayNumber: number
  timeSlot: 'morning' | 'afternoon' | 'evening'
  activityName: string
  activityType: string
  notes: string
}

const ISLANDS = [
  'Nassau',
  'The Exumas',
  'Eleuthera',
  'Harbour Island',
  'Andros',
  'Grand Bahama',
  'The Abacos',
  'Paradise Island',
  'Long Island',
  'Bimini',
]

const TIME_SLOTS: Array<{ value: 'morning' | 'afternoon' | 'evening'; label: string }> = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]

function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.min(diff + 1, 14)) // cap at 14 days
}

function localId() {
  return Math.random().toString(36).slice(2)
}

interface AddActivityModalProps {
  dayNumber: number
  timeSlot: 'morning' | 'afternoon' | 'evening'
  island: string
  onAdd: (item: Omit<ActivityItem, 'id' | 'dayNumber' | 'timeSlot'>) => void
  onClose: () => void
}

function AddActivityModal({ dayNumber, timeSlot, island, onAdd, onClose }: AddActivityModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Attraction[]>([])
  const [loading, setLoading] = useState(false)
  const [customName, setCustomName] = useState('')
  const [notes, setNotes] = useState('')
  const [tab, setTab] = useState<'search' | 'custom'>('search')

  const search = useCallback(async (q: string) => {
    setLoading(true)
    const supabase = createClient()
    let query_builder = supabase
      .from('bahamas_attractions')
      .select('id, name, category, island, description')
      .limit(10)

    if (island) {
      query_builder = query_builder.ilike('island', `%${island}%`)
    }
    if (q.trim()) {
      query_builder = query_builder.ilike('name', `%${q}%`)
    }

    const { data } = await query_builder
    setResults((data as Attraction[]) ?? [])
    setLoading(false)
  }, [island])

  useEffect(() => {
    search('')
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const slotLabel = TIME_SLOTS.find(s => s.value === timeSlot)?.label ?? timeSlot

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Add to Day {dayNumber}</h3>
            <p className="text-xs text-gray-400">{slotLabel}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 leading-none">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-0">
          <button
            onClick={() => setTab('search')}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              tab === 'search' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Browse Attractions
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              tab === 'custom' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Add Custom
          </button>
        </div>

        {tab === 'search' ? (
          <>
            <div className="px-5 pt-3">
              <TravelSearchField label="Search attractions" htmlFor="activity-search" className="bg-white">
                <TravelSearchInput
                  id="activity-search"
                  type="text"
                  placeholder="Search beaches, tours, food, culture"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
              </TravelSearchField>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {loading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Searching…</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No attractions found</p>
              ) : (
                results.map(a => (
                  <button
                    key={a.id}
                    onClick={() => {
                      onAdd({ activityName: a.name, activityType: a.category, notes: '' })
                      onClose()
                    }}
                    className="w-full text-left bg-gray-50 hover:bg-brand-50 rounded-xl p-3 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700">{a.name}</p>
                      <span className="text-xs bg-white text-gray-500 rounded-full px-2 py-0.5 shrink-0 border border-gray-100">
                        {a.category}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 px-5 py-4 space-y-4">
            <TravelSearchField label="Activity name" htmlFor="custom-activity-name" className="bg-white">
              <TravelSearchInput
                id="custom-activity-name"
                type="text"
                placeholder="Beach walk, dinner at Graycliff"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                autoFocus
              />
            </TravelSearchField>
            <TravelSearchField label="Notes" hint="Optional" htmlFor="custom-activity-notes" className="bg-white">
              <TravelSearchTextarea
                id="custom-activity-notes"
                placeholder="Any details, reminders, or links"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="min-h-24 resize-none"
              />
            </TravelSearchField>
            <button
              disabled={!customName.trim()}
              onClick={() => {
                if (!customName.trim()) return
                onAdd({ activityName: customName.trim(), activityType: 'Custom', notes: notes.trim() })
                onClose()
              }}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              Add to Day {dayNumber}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TripBuilder() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('Nassau')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<{
    dayNumber: number
    timeSlot: 'morning' | 'afternoon' | 'evening'
  } | null>(null)

  const numDays = startDate && endDate ? daysBetween(startDate, endDate) : 3

  function openModal(dayNumber: number, timeSlot: 'morning' | 'afternoon' | 'evening') {
    setModal({ dayNumber, timeSlot })
  }

  function addActivity(dayNumber: number, timeSlot: 'morning' | 'afternoon' | 'evening', item: Omit<ActivityItem, 'id' | 'dayNumber' | 'timeSlot'>) {
    setActivities(prev => [...prev, {
      id: localId(),
      dayNumber,
      timeSlot,
      ...item,
    }])
  }

  function removeActivity(id: string) {
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Please give your trip a name.')
      return
    }
    setSaving(true)
    setError('')

    try {
      const payload = {
        title: title.trim(),
        destination,
        startDate: startDate || null,
        endDate: endDate || null,
        activities: activities.map((a, i) => ({
          dayNumber: a.dayNumber,
          timeSlot: a.timeSlot,
          activityName: a.activityName,
          activityType: a.activityType,
          notes: a.notes,
          sortOrder: i,
        })),
      }

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to save trip')
        setSaving(false)
        return
      }

      router.push(`/trip/${data.tripId}`)
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  const dayNumbers = Array.from({ length: numDays }, (_, i) => i + 1)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Plan a Trip</h1>
      <p className="text-gray-500 text-sm mb-8">Fill in the basics, then build your day-by-day plan.</p>

      {/* Trip Details */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Trip details</h2>

        <TravelSearchField label="Trip name" htmlFor="trip-builder-title" className="bg-white">
          <TravelSearchInput
            id="trip-builder-title"
            type="text"
            placeholder="e.g. Bahamas Summer 2026"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </TravelSearchField>

        <TravelSearchField label="Main island" htmlFor="trip-builder-destination" className="bg-white">
          <TravelSearchSelect
            id="trip-builder-destination"
            value={destination}
            onChange={e => setDestination(e.target.value)}
          >
            {ISLANDS.map(island => (
              <option key={island} value={island}>{island}</option>
            ))}
          </TravelSearchSelect>
        </TravelSearchField>

        <BahaDateRangePicker
          label="Travel dates"
          layout="field"
          start={startDate}
          end={endDate}
          onChange={(start, end) => {
            setStartDate(start)
            setEndDate(end)
          }}
          placeholder="Add dates"
        />

        {startDate && endDate && (
          <p className="text-sm text-brand-600 font-medium">
            {numDays} day{numDays !== 1 ? 's' : ''} · {destination}
          </p>
        )}
      </section>

      {/* Day-by-Day Builder */}
      <section className="space-y-4 mb-8">
        <h2 className="text-base font-semibold text-gray-800">
          Itinerary
          {!startDate && <span className="ml-2 text-xs text-gray-400 font-normal">(showing 3-day template — add dates above to expand)</span>}
        </h2>

        {dayNumbers.map(dayNum => {
          const dayActivities = activities.filter(a => a.dayNumber === dayNum)

          return (
            <div key={dayNum} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-brand-50 px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm">Day {dayNum}</h3>
              </div>

              <div className="divide-y divide-gray-50">
                {TIME_SLOTS.map(({ value: slot, label }) => {
                  const slotItems = dayActivities.filter(a => a.timeSlot === slot)

                  return (
                    <div key={slot} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-400 uppercase">
                          {label}
                        </p>
                        <button
                          onClick={() => openModal(dayNum, slot)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          + Add
                        </button>
                      </div>

                      {slotItems.length === 0 ? (
                        <button
                          onClick={() => openModal(dayNum, slot)}
                          className="w-full text-left text-xs text-gray-300 py-2 hover:text-gray-400 transition-colors"
                        >
                          Tap to add an activity…
                        </button>
                      ) : (
                        <ul className="space-y-2">
                          {slotItems.map(item => (
                            <li key={item.id} className="flex items-start gap-2 group">
                              <span className="text-gray-300 mt-0.5">•</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 font-medium leading-tight">{item.activityName}</p>
                                {item.notes && (
                                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.notes}</p>
                                )}
                              </div>
                              <button
                                onClick={() => removeActivity(item.id)}
                                className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs shrink-0"
                                aria-label="Remove"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      {/* Save */}
      {error && (
        <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {saving ? 'Saving…' : 'Save Trip'}
        </button>
      </div>

      {/* Activity modal */}
      {modal && (
        <AddActivityModal
          dayNumber={modal.dayNumber}
          timeSlot={modal.timeSlot}
          island={destination}
          onAdd={(item) => addActivity(modal.dayNumber, modal.timeSlot, item)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
