import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isDateOnlyString } from '@/lib/trips/trip-field-validation'

const TIME_SLOTS = new Set(['morning', 'afternoon', 'evening'])
const MAX_ACTIVITIES = 100

function isValidActivity(value: unknown): value is ActivityItem {
  if (!value || typeof value !== 'object') return false
  const a = value as Record<string, unknown>
  return (
    typeof a.dayNumber === 'number' && Number.isInteger(a.dayNumber) && a.dayNumber >= 1 && a.dayNumber <= 60 &&
    typeof a.timeSlot === 'string' && TIME_SLOTS.has(a.timeSlot) &&
    typeof a.activityName === 'string' && a.activityName.trim().length > 0 && a.activityName.length <= 200 &&
    (a.activityType === undefined || a.activityType === null || typeof a.activityType === 'string') &&
    (a.notes === undefined || a.notes === null || (typeof a.notes === 'string' && a.notes.length <= 2000)) &&
    typeof a.sortOrder === 'number' && Number.isFinite(a.sortOrder)
  )
}

interface ActivityItem {
  dayNumber: number
  timeSlot: 'morning' | 'afternoon' | 'evening'
  activityName: string
  activityType?: string
  notes?: string
  sortOrder: number
}

interface CreateTripBody {
  title: string
  destination: string
  startDate: string | null
  endDate: string | null
  activities?: ActivityItem[]
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateTripBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 })
  }

  const { title, destination, startDate, endDate } = body
  const activities = body.activities ?? []

  // Validate everything before inserting so a bad payload never leaves an
  // orphan draft trip behind.
  if (typeof title !== 'string' || !title.trim() || title.length > 200) {
    return NextResponse.json({ error: 'Trip title is required' }, { status: 400 })
  }
  if (destination != null && (typeof destination !== 'string' || destination.length > 80)) {
    return NextResponse.json({ error: 'Invalid destination' }, { status: 400 })
  }
  if ((startDate && !isDateOnlyString(startDate)) || (endDate && !isDateOnlyString(endDate))) {
    return NextResponse.json({ error: 'Dates must be YYYY-MM-DD' }, { status: 400 })
  }
  if (startDate && endDate && endDate < startDate) {
    return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 })
  }
  if (!Array.isArray(activities) || activities.length > MAX_ACTIVITIES || !activities.every(isValidActivity)) {
    return NextResponse.json({ error: 'Invalid activities' }, { status: 400 })
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      name: title.trim(),
      status: 'draft',
      islands: destination ? [destination] : [],
      date_start: startDate || null,
      date_end: endDate || null,
      party_type: 'couple',
      party_size: 2,
    })
    .select('id')
    .single()

  if (tripError || !trip) {
    if (tripError) console.error('[POST /api/trips]', tripError)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }

  if (activities.length > 0) {
    const activityRows = activities.map(a => ({
      trip_id: trip.id,
      day_number: a.dayNumber,
      time_slot: a.timeSlot,
      activity_name: a.activityName,
      activity_type: a.activityType ?? null,
      notes: a.notes ?? null,
      sort_order: a.sortOrder,
    }))

    const { error: actErr } = await supabase
      .from('trip_activities')
      .insert(activityRows)

    if (actErr) {
      // Trip was created; activities failed — return tripId anyway so user can view
      return NextResponse.json({ tripId: trip.id, warning: 'Activities could not be saved' })
    }
  }

  return NextResponse.json({ tripId: trip.id })
}
