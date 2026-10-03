import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const root = path.resolve(__dirname, '../..')
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')

const FORM_SOURCES: Record<string, string> = {
  'baha-buddy-cruise-day-intake': 'src/app/build-my-cruise-day/page.tsx',
  'baha-buddy-paid-concierge-details': 'src/app/concierge-trip-plan/success/page.tsx',
  'baha-buddy-concierge-interest': 'src/components/revenue/ConciergeInterestForm.tsx',
  'baha-buddy-partner-application': 'src/components/revenue/PartnerApplicationForm.tsx',
  'baha-buddy-travel-document-lead': 'src/components/revenue/TravelDocumentLeadForm.tsx',
}

function fieldNames(markup: string): Set<string> {
  return new Set([...markup.matchAll(/\bname="([a-z_-]+)"/g)].map((match) => match[1]))
}

function skeletonForm(skeleton: string, formName: string): string {
  const start = skeleton.indexOf(`<form name="${formName}"`)
  expect(start, `${formName} missing from public/__forms.html`).toBeGreaterThanOrEqual(0)
  return skeleton.slice(start, skeleton.indexOf('</form>', start))
}

describe('Netlify Forms static skeleton', () => {
  const skeleton = read('public/__forms.html')

  test.each(Object.entries(FORM_SOURCES))('%s fields match the rendered form', (formName, source) => {
    const sourceText = read(source)
    const formStart = sourceText.indexOf(`name="${formName}"`)
    expect(formStart, `${formName} not rendered by ${source}`).toBeGreaterThanOrEqual(0)
    const sourceForm = sourceText.slice(formStart, sourceText.indexOf('</form>', formStart))

    const expected = fieldNames(sourceForm)
    expected.delete(formName)
    const declared = fieldNames(skeletonForm(skeleton, formName))
    declared.delete(formName)

    expect([...declared].sort()).toEqual([...expected].sort())
  })
})
