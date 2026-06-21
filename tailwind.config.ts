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

        // ── Exact BahaColors aliases for cross-platform parity ──
        baha: {
          brandBlue: "#0679DA",
          brandBlueAlt: "#0382DE",
          deepNavy: "#0B2545",
          royalBlue: "#156FD1",
          waveCyan: "#02ABF1",
          waveCyanLight: "#E0F7FF",
          sunYellow: "#FDC736",
          sunYellowDark: "#D89B00",
          offWhite: "#F4F8FB",
          white: "#FFFFFF",
          charcoal: "#374151",
          grey: "#6B7280",
          palm: "#2D8B56",
          coral: "#FF7A59",
        },

        // ── Primary brand (mobile app + logo royal blue) ──
        // The exact BahaColors values stay available under `baha.*`.
        // The utility scale uses royalBlue for common public surfaces
        // so existing `bg-brand-600` usage matches the Buddy logo/app shell.
        brand: {
          50:  "#EAF8FF",
          100: "#D6F1FF",
          200: "#ADE3FF",
          300: "#7ED1FB",
          400: "#02ABF1",  // BahaColors.waveCyan — light icon/hover accent
          500: "#0679DA",  // BahaColors.brandBlue — bright app blue
          600: "#156FD1",  // BahaColors.royalBlue — primary logo/app surface
          700: "#0B4D96",  // darker pressed/hover state
          800: "#0B3F7A",
          900: "#0B2545",  // BahaColors.deepNavy
        },

        // ── Cyan wave (from logo) ──
        cyan: {
          DEFAULT: "#02ABF1", // BahaColors.waveCyan
          50: "#E0F7FF",
          500: "#02ABF1",
          700: "#0077B6",
        },

        // ── Secondary — Gold ──
        gold: {
          50:  "#FFF9E6",
          100: "#FFF0BE",
          200: "#FFE184",
          300: "#FFD35F",
          400: "#FDC736",
          500: "#FDC736",  // BahaColors.sunYellow
          600: "#D89B00",  // BahaColors.sunYellowDark
          700: "#A97C14",
          800: "#7E5E0F",
          900: "#543F0A",
        },

        // ── Accent — Coral (warm complement) ──
        coral: {
          50:  "#FFF1ED",
          100: "#FFE3DA",
          200: "#FFC7B8",
          300: "#FFA38C",
          400: "#FF8C6E",
          500: "#FF7A59",  // BahaColors.coral
          600: "#E45635",
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
        night:    "#0B2545",  // BahaColors.night / deepNavy
        charcoal: "#374151",  // BahaColors.charcoal
        offwhite: "#F4F8FB",  // BahaColors.offWhite

        // ── Chat surfaces (mobile parity) ──
        "buddy-bubble": "#F0F5FA",  // BahaColors.buddyBubble — Buddy speech bg
        "user-bubble": "#0B2545",   // BahaColors.userBubble — user speech bg
      },

      fontFamily: {
        // Figtree wired via next/font/google in app/layout.tsx.
        // This mirrors mobile BahaTypography.
        sans: ["var(--font-figtree)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },

      backgroundImage: {
        // Mobile-inspired gradients with royal logo blue as the public web base.
        "gradient-brand":   "linear-gradient(135deg, #156FD1 0%, #156FD1 55%, #02ABF1 100%)",
        "gradient-sunset":  "linear-gradient(135deg, #FDC736 0%, #02ABF1 50%, #156FD1 100%)",
        "gradient-splash":  "linear-gradient(180deg, #0B2545 0%, #156FD1 42%, #156FD1 68%, #02ABF1 100%)",

        // Hero card overlays
        "hero-dark":   "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)",
        "hero-bottom": "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)",
        "hero-left":   "linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 100%)",
      },

      boxShadow: {
        // Brand-tinted lifts — the default "card has weight" shadow
        card:        "0 4px 12px rgba(21, 111, 209, 0.08)",
        "card-hover":"0 8px 20px rgba(21, 111, 209, 0.12)",
        // Gold accent shadow — reserved for Buddy's Pick and similar standout cards
        "gold-glow": "0 8px 20px rgba(253, 199, 54, 0.18)",
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
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(21, 111, 209, 0.4)" },
          "50%":      { boxShadow: "0 0 0 12px rgba(21, 111, 209, 0)" },
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
