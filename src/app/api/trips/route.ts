import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
  activities: ActivityItem[]
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

  const { title, destination, startDate, endDate, activities } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Trip title is required' }, { status: 400 })
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
    return NextResponse.json({ error: tripError?.message ?? 'Failed to create trip' }, { status: 500 })
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
