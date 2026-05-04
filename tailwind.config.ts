import type { Config } from "tailwindcss";

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
        brand: {
          50:  "#EBF3FC",
          100: "#D0E5F8",
          200: "#A2CCF2",
          300: "#73B2EB",
          400: "#4C97E4",
          500: "#2E78D2",
          600: "#2565B0",
          700: "#1C528E",
          800: "#143F6C",
          900: "#0C2C4A",
        },
        gold: {
          50:  "#FEF9EC",
          100: "#FDF0C9",
          200: "#FBE193",
          300: "#F9D25E",
          400: "#F7C238",
          500: "#F5B731",
          600: "#D49A1B",
          700: "#A97C14",
          800: "#7E5E0F",
          900: "#543F0A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
