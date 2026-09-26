function minutesLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ')
}

export function tourDurationLabel(min: number, max: number): string {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) {
    return 'Duration not listed'
  }
  const start = minutesLabel(Math.round(min))
  const end = minutesLabel(Math.round(max))
  return start === end ? start : `${start}–${end}`
}
