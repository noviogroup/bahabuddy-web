export type AirportSearchOption = {
  value: string
  label: string
  code?: string
  description?: string
  keywords?: string[]
}

export const ORIGIN_AIRPORT_OPTIONS: AirportSearchOption[] = [
  { value: 'Miami', label: 'Miami', code: 'MIA', description: 'Miami International Airport', keywords: ['south florida'] },
  { value: 'Fort Lauderdale', label: 'Fort Lauderdale', code: 'FLL', description: 'Fort Lauderdale-Hollywood International Airport', keywords: ['south florida'] },
  { value: 'West Palm Beach', label: 'West Palm Beach', code: 'PBI', description: 'Palm Beach International Airport', keywords: ['south florida', 'palm beach'] },
  { value: 'New York', label: 'New York', code: 'JFK', description: 'John F. Kennedy International Airport', keywords: ['nyc'] },
  { value: 'Newark', label: 'Newark', code: 'EWR', description: 'Newark Liberty International Airport', keywords: ['new york', 'nyc'] },
  { value: 'LaGuardia', label: 'LaGuardia', code: 'LGA', description: 'New York LaGuardia Airport', keywords: ['new york', 'nyc'] },
  { value: 'Atlanta', label: 'Atlanta', code: 'ATL', description: 'Hartsfield-Jackson Atlanta International Airport' },
  { value: 'Charlotte', label: 'Charlotte', code: 'CLT', description: 'Charlotte Douglas International Airport' },
  { value: 'Raleigh Durham', label: 'Raleigh / Durham', code: 'RDU', description: 'Raleigh-Durham International Airport', keywords: ['raleigh', 'durham'] },
  { value: 'Baltimore', label: 'Baltimore', code: 'BWI', description: 'Baltimore/Washington International Airport', keywords: ['washington dc'] },
  { value: 'Nashville', label: 'Nashville', code: 'BNA', description: 'Nashville International Airport' },
  { value: 'Dallas', label: 'Dallas', code: 'DFW', description: 'Dallas Fort Worth International Airport' },
  { value: 'Houston', label: 'Houston', code: 'IAH', description: 'George Bush Intercontinental Airport' },
  { value: 'Houston Hobby', label: 'Houston Hobby', code: 'HOU', description: 'William P. Hobby Airport', keywords: ['houston'] },
  { value: 'Chicago', label: 'Chicago', code: 'ORD', description: "O'Hare International Airport" },
  { value: 'Los Angeles', label: 'Los Angeles', code: 'LAX', description: 'Los Angeles International Airport' },
  { value: 'San Francisco', label: 'San Francisco', code: 'SFO', description: 'San Francisco International Airport' },
  { value: 'Boston', label: 'Boston', code: 'BOS', description: 'Boston Logan International Airport' },
  { value: 'Philadelphia', label: 'Philadelphia', code: 'PHL', description: 'Philadelphia International Airport' },
  { value: 'Washington', label: 'Washington, DC', code: 'IAD', description: 'Washington Dulles International Airport', keywords: ['dc', 'dulles'] },
  { value: 'Orlando', label: 'Orlando', code: 'MCO', description: 'Orlando International Airport' },
  { value: 'Tampa', label: 'Tampa', code: 'TPA', description: 'Tampa International Airport' },
  { value: 'Jacksonville', label: 'Jacksonville', code: 'JAX', description: 'Jacksonville International Airport' },
  { value: 'Fort Myers', label: 'Fort Myers', code: 'RSW', description: 'Southwest Florida International Airport' },
  { value: 'New Orleans', label: 'New Orleans', code: 'MSY', description: 'Louis Armstrong New Orleans International Airport' },
  { value: 'Detroit', label: 'Detroit', code: 'DTW', description: 'Detroit Metropolitan Wayne County Airport' },
  { value: 'Denver', label: 'Denver', code: 'DEN', description: 'Denver International Airport' },
  { value: 'Seattle', label: 'Seattle', code: 'SEA', description: 'Seattle-Tacoma International Airport' },
  { value: 'Minneapolis', label: 'Minneapolis', code: 'MSP', description: 'Minneapolis-Saint Paul International Airport' },
  { value: 'Phoenix', label: 'Phoenix', code: 'PHX', description: 'Phoenix Sky Harbor International Airport' },
  { value: 'Las Vegas', label: 'Las Vegas', code: 'LAS', description: 'Harry Reid International Airport' },
  { value: 'San Diego', label: 'San Diego', code: 'SAN', description: 'San Diego International Airport' },
  { value: 'Portland', label: 'Portland', code: 'PDX', description: 'Portland International Airport' },
  { value: 'Toronto', label: 'Toronto', code: 'YYZ', description: 'Toronto Pearson International Airport' },
  { value: 'Montreal', label: 'Montreal', code: 'YUL', description: 'Montréal-Trudeau International Airport' },
  { value: 'Vancouver', label: 'Vancouver', code: 'YVR', description: 'Vancouver International Airport' },
  { value: 'London', label: 'London', code: 'LHR', description: 'London Heathrow Airport' },
]

export const BAHAMAS_AIRPORT_OPTIONS: Array<AirportSearchOption & { code: string }> = [
  { value: 'NAS', code: 'NAS', label: 'Nassau', description: 'Lynden Pindling International Airport', keywords: ['new providence', 'paradise island'] },
  { value: 'EXU', code: 'EXU', label: 'Exuma', description: 'Exuma International Airport', keywords: ['george town', 'great exuma'] },
  { value: 'ELH', code: 'ELH', label: 'North Eleuthera', description: 'North Eleuthera Airport', keywords: ['harbour island', 'spanish wells', 'eleuthera'] },
  { value: 'GHB', code: 'GHB', label: "Governor's Harbour", description: "Governor's Harbour Airport", keywords: ['eleuthera'] },
  { value: 'FPO', code: 'FPO', label: 'Freeport / Grand Bahama', description: 'Grand Bahama International Airport', keywords: ['freeport', 'grand bahama'] },
  { value: 'BIM', code: 'BIM', label: 'Bimini', description: 'South Bimini Airport' },
  { value: 'ASD', code: 'ASD', label: 'Andros', description: 'Andros Town International Airport' },
  { value: 'MHH', code: 'MHH', label: 'Marsh Harbour / Abacos', description: 'Leonard M. Thompson International Airport', keywords: ['abaco', 'abacos', 'marsh harbour'] },
]

export const CITY_TO_IATA: Record<string, string> = {
  miami: 'MIA',
  'fort lauderdale': 'FLL',
  'west palm beach': 'PBI',
  'palm beach': 'PBI',
  'new york': 'JFK',
  jfk: 'JFK',
  newark: 'EWR',
  laguardia: 'LGA',
  atlanta: 'ATL',
  charlotte: 'CLT',
  'raleigh': 'RDU',
  'raleigh durham': 'RDU',
  baltimore: 'BWI',
  nashville: 'BNA',
  dallas: 'DFW',
  houston: 'IAH',
  'houston hobby': 'HOU',
  chicago: 'ORD',
  'los angeles': 'LAX',
  'san francisco': 'SFO',
  boston: 'BOS',
  philadelphia: 'PHL',
  washington: 'IAD',
  dc: 'IAD',
  orlando: 'MCO',
  tampa: 'TPA',
  jacksonville: 'JAX',
  'fort myers': 'RSW',
  'new orleans': 'MSY',
  detroit: 'DTW',
  denver: 'DEN',
  seattle: 'SEA',
  minneapolis: 'MSP',
  phoenix: 'PHX',
  'las vegas': 'LAS',
  'san diego': 'SAN',
  portland: 'PDX',
  toronto: 'YYZ',
  montreal: 'YUL',
  vancouver: 'YVR',
  london: 'LHR',
  nassau: 'NAS',
  freeport: 'FPO',
}

export function resolveAirportCode(input: string): string | null {
  if (!input) return null

  const clean = input.trim()
  if (/^[A-Z]{3}$/i.test(clean)) return clean.toUpperCase()

  const lower = normalizeAirportLookup(clean)
  if (CITY_TO_IATA[lower]) return CITY_TO_IATA[lower]

  for (const [city, code] of Object.entries(CITY_TO_IATA)) {
    if (lower.includes(city) || city.includes(lower)) return code
  }

  return null
}

function normalizeAirportLookup(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
