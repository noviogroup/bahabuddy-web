import { describe, expect, test } from 'vitest'
import {
  knownStayIslandFilterLabel,
  stayIslandFilterAliases,
  stayIslandFilterLabel,
} from '@/lib/stay-island-filters'

describe('stay island filters', () => {
  test('normalizes public display names and slugs to stay inventory labels', () => {
    expect(stayIslandFilterLabel('The Exumas')).toBe('Exuma')
    expect(stayIslandFilterLabel('the-exumas')).toBe('Exuma')
    expect(stayIslandFilterLabel('The Abacos')).toBe('Abaco')
    expect(stayIslandFilterLabel('abacos')).toBe('Abaco')
  })

  test('keeps exact island labels distinct before broader aliases match', () => {
    expect(stayIslandFilterLabel('Paradise Island')).toBe('Paradise Island')
    expect(stayIslandFilterLabel('Nassau & Paradise Island')).toBe('Nassau')
    expect(stayIslandFilterLabel('Eleuthera & Harbour Island')).toBe('Eleuthera')
  })

  test('expands stay searches across known inventory aliases', () => {
    expect(stayIslandFilterAliases('The Exumas')).toEqual(
      expect.arrayContaining(['Exuma', 'The Exumas', 'Great Exuma']),
    )
    expect(stayIslandFilterAliases('the-abacos')).toEqual(
      expect.arrayContaining(['Abaco', 'Abacos', 'The Abacos']),
    )
    expect(stayIslandFilterAliases('Freeport - Grand Bahama Island')).toEqual(
      expect.arrayContaining(['Grand Bahama', 'Freeport']),
    )
  })

  test('distinguishes known filters from display fallbacks', () => {
    expect(knownStayIslandFilterLabel('Cat Island')).toBe('')
    expect(stayIslandFilterLabel('cat-island')).toBe('Cat Island')
  })
})
