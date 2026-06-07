import type { Config } from "tailwindcss";

/**
 * Baha Buddy — Tailwind Config
 *
 * Tokens ported 1:1 from /Baha-Buddy-V2/lib/core/theme/baha_theme.dart
 * Brand source of truth: BahaColors / BahaTypography / BahaSpacing classes.
 *
 * Color usage:
 * - brand (ocean blue):  primary buttons, links, active nav, user chat bubbles
 * - gold:                Buddy's Pick accent, "THIS WEEK" badges, key highlights
 * - coral:               adventure / family vibes, warm accents
 * - palm:                success states, booked status, payment confirmed
 * - sand:                onboarding backgrounds, soft tinted cards
 * - night:               heading text color
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // ── Primary brand (ocean) ──
        brand: {
          50:  "#EBF3FC",
          100: "#D0E5F8",
          200: "#A2CCF2",
          300: "#73B2EB",
          400: "#4C97E4",
          500: "#2E78D2",  // BahaColors.ocean — primary
          600: "#2565B0",
          700: "#1C528E",
          800: "#143F6C",
          900: "#0C2C4A",
        },

        // ── Cyan wave (from logo) ──
        cyan: {
          DEFAULT: "#38BDF8", // BahaColors.oceanBright
        },

        // ── Secondary — Gold ──
        gold: {
          50:  "#FEF9EC",
          100: "#FDF0C9",
          200: "#FBE193",
          300: "#F9D25E",
          400: "#F7C238",
          500: "#F5B731",  // BahaColors.gold
          600: "#D49A1B",
          700: "#A97C14",
          800: "#7E5E0F",
          900: "#543F0A",
        },

        // ── Accent — Coral (warm complement) ──
        coral: {
          50:  "#FEF1EC",
          100: "#FDDED2",
          200: "#FABBA1",
          300: "#F49872",
          400: "#EE7E55",
          500: "#E8734A",  // BahaColors.coral
          600: "#C45A34",
          700: "#9D4525",
          800: "#76321A",
          900: "#4E2010",
        },

        // ── Nature — Palm ──
        palm: {
          50:  "#E6F5EC",
          100: "#C2E5D0",
          200: "#8BCDA6",
          300: "#5BB785",
          400: "#3DA06C",
          500: "#2D8B56",  // BahaColors.palm — success
          600: "#246E44",
          700: "#1A5333",
          800: "#123821",
          900: "#091F12",
        },

        // ── Sand (warm neutral) ──
        sand: {
          50:  "#FFF8EC",
          100: "#FFF4E6",  // BahaColors.sandLight
          200: "#FCEED5",
          300: "#F8E2B8",
          400: "#F5E6C8",  // BahaColors.sand
          500: "#E9D4A8",
          600: "#D4C4A0",  // BahaColors.sandDark
          700: "#B8A883",
          800: "#8C7E5F",
          900: "#5F543F",
        },

        // ── Neutrals (named tokens for direct ports from mobile) ──
        night:    "#1A2332",  // BahaColors.night
        charcoal: "#374151",  // BahaColors.charcoal
        offwhite: "#F8FAFB",  // BahaColors.offWhite

        // ── Chat surfaces (mobile parity) ──
        "buddy-bubble": "#F0F5FA",  // BahaColors.buddyBubble — Buddy speech bg
        "user-bubble": "#2E78D2",   // BahaColors.userBubble — user speech bg
      },

      fontFamily: {
        // Plus Jakarta Sans wired via next/font/google in app/layout.tsx
        // (--font-plus-jakarta CSS var). Falls back to system stack.
        sans: ["var(--font-plus-jakarta)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },

      backgroundImage: {
        // Mobile gradients ported from BahaColors.* gradients
        "gradient-brand":   "linear-gradient(135deg, #1B5FAF 0%, #2E78D2 50%, #38BDF8 100%)",
        "gradient-sunset":  "linear-gradient(135deg, #F5B731 0%, #E8734A 50%, #2E78D2 100%)",
        "gradient-splash":  "linear-gradient(180deg, #1B5FAF 0%, #2E78D2 33%, #5A9BE6 66%, #38BDF8 100%)",

        // Hero card overlays
        "hero-dark":   "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)",
        "hero-bottom": "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)",
        "hero-left":   "linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 100%)",
      },

      boxShadow: {
        // Brand-tinted lifts — the default "card has weight" shadow
        card:        "0 4px 12px rgba(46, 120, 210, 0.08)",
        "card-hover":"0 8px 20px rgba(46, 120, 210, 0.12)",
        // Gold accent shadow — reserved for Buddy's Pick and similar standout cards
        "gold-glow": "0 8px 20px rgba(245, 183, 49, 0.18)",
        // Soft surface elevation (no tint)
        soft:        "0 2px 8px rgba(26, 35, 50, 0.06)",
        // Inputs / form fields
        input:       "0 1px 2px rgba(26, 35, 50, 0.04)",
      },

      borderRadius: {
        // Mobile BahaSpacing radii
        "baha-sm":   "8px",
        "baha-md":   "12px",
        "baha-lg":   "16px",
        "baha-xl":   "24px",
      },

      spacing: {
        // Direct ports of BahaSpacing
        "baha-xs":  "4px",
        "baha-sm":  "8px",
        "baha-md":  "16px",
        "baha-lg":  "24px",
        "baha-xl":  "32px",
        "baha-xxl": "48px",
        "baha-3xl": "64px",
      },

      animation: {
        // Buddy avatar micro-animations (CSS-driven, Phase 1)
        "breathe":     "breathe 3s ease-in-out infinite",
        "buddy-think": "buddy-think 1.4s ease-in-out infinite",
        "buddy-pulse": "buddy-pulse 2s ease-in-out infinite",
        "fade-in":     "fadeIn 0.3s ease-out",
        "slide-up":    "slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "baha-orbit":          "baha-orbit 2.2s linear infinite",
        "baha-orbit-counter":  "baha-orbit-counter 2.2s linear infinite",
        "baha-loader-ring":    "baha-loader-ring 2.8s linear infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%":      { transform: "scale(1.03)" },
        },
        "buddy-think": {
          "0%, 100%": { opacity: "0.4", transform: "translateY(0)" },
          "50%":      { opacity: "1",   transform: "translateY(-2px)" },
        },
        "buddy-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(46, 120, 210, 0.4)" },
          "50%":      { boxShadow: "0 0 0 12px rgba(46, 120, 210, 0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "baha-orbit": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "baha-orbit-counter": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(-360deg)" },
        },
        "baha-loader-ring": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
