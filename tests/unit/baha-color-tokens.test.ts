import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const EXPECTED_BAHA_COLORS = {
  brandBlue: '#0679DA',
  brandBlueAlt: '#0382DE',
  deepNavy: '#0B2545',
  royalBlue: '#156FD1',
  waveCyan: '#02ABF1',
  waveCyanLight: '#E0F7FF',
  sunYellow: '#FDC736',
  sunYellowDark: '#D89B00',
  offWhite: '#F4F8FB',
  white: '#FFFFFF',
  charcoal: '#374151',
  grey: '#6B7280',
  palm: '#2D8B56',
  coral: '#FF7A59',
} as const

const EXPECTED_PUBLIC_SURFACE_COLORS = {
  primary: EXPECTED_BAHA_COLORS.royalBlue,
  primaryHover: '#0B4D96',
} as const

const EXPECTED_GLOBAL_VARS = {
  '--baha-brand-blue': EXPECTED_BAHA_COLORS.brandBlue,
  '--baha-brand-blue-alt': EXPECTED_BAHA_COLORS.brandBlueAlt,
  '--brand-blue': EXPECTED_BAHA_COLORS.brandBlue,
  '--brand-blue-alt': EXPECTED_BAHA_COLORS.brandBlueAlt,
  '--deep-navy': EXPECTED_BAHA_COLORS.deepNavy,
  '--royal-blue': EXPECTED_BAHA_COLORS.royalBlue,
  '--wave-cyan': EXPECTED_BAHA_COLORS.waveCyan,
  '--wave-cyan-light': EXPECTED_BAHA_COLORS.waveCyanLight,
  '--sun-yellow': EXPECTED_BAHA_COLORS.sunYellow,
  '--sun-yellow-dark': EXPECTED_BAHA_COLORS.sunYellowDark,
  '--off-white': EXPECTED_BAHA_COLORS.offWhite,
  '--white': EXPECTED_BAHA_COLORS.white,
  '--charcoal': EXPECTED_BAHA_COLORS.charcoal,
  '--grey': EXPECTED_BAHA_COLORS.grey,
  '--palm': EXPECTED_BAHA_COLORS.palm,
  '--coral': EXPECTED_BAHA_COLORS.coral,
} as const

function readProjectFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), 'utf8')
}

function activeSourceFiles(dir = path.join(process.cwd(), 'src')): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry)
    const relative = path.relative(process.cwd(), fullPath)

    if (relative.startsWith(path.join('src', '_archive'))) return []

    const stat = statSync(fullPath)
    if (stat.isDirectory()) return activeSourceFiles(fullPath)
    if (!/\.(ts|tsx|css)$/.test(entry)) return []
    return [relative]
  })
}

describe('Baha Buddy color tokens', () => {
  test('Tailwind exposes exact BahaColors aliases for web UI parity', () => {
    const tailwindConfig = readProjectFile('tailwind.config.ts')

    Object.entries(EXPECTED_BAHA_COLORS).forEach(([name, value]) => {
      expect(tailwindConfig).toContain(`${name}: "${value}"`)
    })

    expect(tailwindConfig).toContain(`500: "${EXPECTED_BAHA_COLORS.brandBlue}"`)
    expect(tailwindConfig).toContain(`600: "${EXPECTED_PUBLIC_SURFACE_COLORS.primary}"`)
    expect(tailwindConfig).toContain(`700: "${EXPECTED_PUBLIC_SURFACE_COLORS.primaryHover}"`)
    expect(tailwindConfig).toContain(`900: "${EXPECTED_BAHA_COLORS.deepNavy}"`)
    expect(tailwindConfig).toContain(`400: "${EXPECTED_BAHA_COLORS.sunYellow}"`)
  })

  test('global CSS variables keep exact aliases and use royal logo blue for public surfaces', () => {
    const globalsCss = readProjectFile('src/app/globals.css')

    Object.entries(EXPECTED_GLOBAL_VARS).forEach(([name, value]) => {
      const declaration = new RegExp(`${name}:\\s*${value};`)
      expect(globalsCss).toMatch(declaration)
    })

    expect(globalsCss).toMatch(new RegExp(`--brand:\\s*${EXPECTED_PUBLIC_SURFACE_COLORS.primary};`))
    expect(globalsCss).toMatch(new RegExp(`--brand-alt:\\s*${EXPECTED_PUBLIC_SURFACE_COLORS.primary};`))
    expect(globalsCss).toMatch(new RegExp(`--brand-dark:\\s*${EXPECTED_PUBLIC_SURFACE_COLORS.primaryHover};`))
    expect(globalsCss).toMatch(new RegExp(`--gold:\\s*${EXPECTED_BAHA_COLORS.sunYellow};`))
  })

  test('public web gradients use royal logo blue surfaces', () => {
    const tailwindConfig = readProjectFile('tailwind.config.ts')

    expect(tailwindConfig).toContain('"gradient-brand":   "linear-gradient(135deg, #156FD1 0%, #156FD1 55%, #02ABF1 100%)"')
    expect(tailwindConfig).toContain('"gradient-splash":  "linear-gradient(180deg, #0B2545 0%, #156FD1 42%, #156FD1 68%, #02ABF1 100%)"')
  })

  test('shared customer-facing surfaces use royal logo blue and sun yellow instead of legacy brand colors', () => {
    const loader = readProjectFile('src/components/ui/BahaPageLoader.tsx')
    const checkout = readProjectFile('src/components/checkout/CheckoutForm.tsx')
    const datePicker = readProjectFile('src/components/ui/date/baha-date-picker.css')

    expect(loader).toContain(EXPECTED_PUBLIC_SURFACE_COLORS.primary)
    expect(loader).toContain(EXPECTED_BAHA_COLORS.sunYellow)
    expect(loader).toContain(EXPECTED_BAHA_COLORS.sunYellowDark)
    expect(loader).not.toMatch(/#2E78D2|#38BDF8|#F5B731|#F7C238/i)

    expect(checkout).toContain(`colorPrimary: '${EXPECTED_PUBLIC_SURFACE_COLORS.primary}'`)
    expect(checkout).toContain(`border: '1px solid ${EXPECTED_PUBLIC_SURFACE_COLORS.primary}'`)
    expect(checkout).not.toContain("colorPrimary: '#0679DA'")

    expect(datePicker).toMatch(/--rdp-accent-color:\s*#156fd1;/i)
    expect(datePicker).not.toMatch(/--rdp-accent-color:\s*#0679da;/i)
  })

  test('active source does not use generic sky or blue utility classes for brand surfaces', () => {
    const offenders = activeSourceFiles()
      .flatMap((filePath) => {
        const contents = readProjectFile(filePath)
        const matches = contents.match(/\b(?:bg|text|border|from|via|to|ring|shadow|decoration|outline)-(?:sky|blue)-/g) ?? []
        return matches.map((match) => `${filePath}: ${match}`)
      })

    expect(offenders).toEqual([])
  })

  test('active source does not use pre-parity legacy web brand hex values', () => {
    const offenders = activeSourceFiles()
      .flatMap((filePath) => {
        const contents = readProjectFile(filePath)
        const matches = contents.match(/#(?:2E78D2|38BDF8|F5B731|F7C238)/gi) ?? []
        return matches.map((match) => `${filePath}: ${match}`)
      })

    expect(offenders).toEqual([])
  })
})
