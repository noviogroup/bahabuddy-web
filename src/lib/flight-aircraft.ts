export interface FlightAircraftDetails {
  codes: string[]
  types: string[]
}

const AIRCRAFT_TYPE_LABELS: Record<string, string> = {
  '221': 'Airbus A220-100',
  '223': 'Airbus A220-300',
  '318': 'Airbus A318',
  '319': 'Airbus A319',
  '31N': 'Airbus A319neo',
  '320': 'Airbus A320',
  '32N': 'Airbus A320neo',
  '321': 'Airbus A321',
  '32Q': 'Airbus A321neo',
  '332': 'Airbus A330-200',
  '333': 'Airbus A330-300',
  '338': 'Airbus A330-800neo',
  '339': 'Airbus A330-900neo',
  '359': 'Airbus A350-900',
  '35K': 'Airbus A350-1000',
  '388': 'Airbus A380-800',
  '717': 'Boeing 717-200',
  '733': 'Boeing 737-300',
  '734': 'Boeing 737-400',
  '735': 'Boeing 737-500',
  '736': 'Boeing 737-600',
  '73G': 'Boeing 737-700',
  '738': 'Boeing 737-800',
  '739': 'Boeing 737-900',
  '7M7': 'Boeing 737 MAX 7',
  '7M8': 'Boeing 737 MAX 8',
  '7M9': 'Boeing 737 MAX 9',
  '7MJ': 'Boeing 737 MAX 10',
  '744': 'Boeing 747-400',
  '748': 'Boeing 747-8',
  '752': 'Boeing 757-200',
  '753': 'Boeing 757-300',
  '762': 'Boeing 767-200',
  '763': 'Boeing 767-300',
  '764': 'Boeing 767-400',
  '772': 'Boeing 777-200',
  '773': 'Boeing 777-300',
  '77L': 'Boeing 777-200LR',
  '77W': 'Boeing 777-300ER',
  '788': 'Boeing 787-8',
  '789': 'Boeing 787-9',
  '78X': 'Boeing 787-10',
  'AT4': 'ATR 42',
  'AT5': 'ATR 42-500',
  'AT7': 'ATR 72',
  'CR2': 'Bombardier CRJ-200',
  'CR7': 'Bombardier CRJ-700',
  'CR9': 'Bombardier CRJ-900',
  'DH4': 'De Havilland Dash 8-400',
  'E70': 'Embraer 170',
  'E75': 'Embraer 175',
  'E90': 'Embraer 190',
  'E95': 'Embraer 195',
}

export function aircraftDetailsForSegments(
  segments: Record<string, unknown>[],
  segmentAmenitiesValue: unknown,
): FlightAircraftDetails {
  const amenitiesBySegment = new Map<string, unknown>()
  for (const value of recordList(segmentAmenitiesValue)) {
    const segmentKey = stringValue(value.segmentKey)
    if (segmentKey) amenitiesBySegment.set(segmentKey, value.aircraftType)
  }

  const codes: string[] = []
  const types: string[] = []
  for (const segment of segments) {
    const segmentKey = stringValue(segment.segmentKey)
    const decoded = decodeAircraftType(
      amenitiesBySegment.get(segmentKey) ??
        segment.aircraftType ??
        asRecord(segment.aircraft).type ??
        asRecord(segment.equipment).code,
    )
    if (!decoded) continue
    if (decoded.code && !codes.includes(decoded.code)) codes.push(decoded.code)
    if (!types.includes(decoded.label)) types.push(decoded.label)
  }

  return { codes, types }
}

export function decodeAircraftType(value: unknown): { code?: string; label: string } | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const raw = String(value).trim()
  if (!raw || raw.toLowerCase() === 'null') return undefined
  const code = raw.toUpperCase()
  const decoded = AIRCRAFT_TYPE_LABELS[code]
  if (decoded) return { code, label: decoded }
  return /^[A-Z0-9]{2,4}$/.test(code) ? { code, label: raw } : { label: raw }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function recordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
