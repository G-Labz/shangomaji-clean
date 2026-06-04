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
        brand: {
          red: "#e53e2a",
          orange: "#f07030",
          yellow: "#f5c518",
        },
        surface: {
          DEFAULT: "#111111",
          raised: "#1a1a1a",
          elevated: "#242424",
          overlay: "#2e2e2e",
        },
        ink: {
          DEFAULT: "#ffffff",
          muted: "#a3a3a3",
          faint: "#6b6b6b",
        },
        // Phase 10J-I-R3-A — Forge command surfaces. Warm-black ramp aligned
        // to the --surface-* CSS variables already used at runtime, so the new
        // dashboard surfaces sit in the existing ember atmosphere instead of the
        // cooler `surface.*` grays the public site uses. Additive — nothing here
        // changes an existing token.
        forge: {
          base:      "#080506",
          raised:    "#110c0a",
          stage:     "#160f0c",
          cartridge: "#14100e",
          ledger:    "#0d0908",
        },
        // Phase 10J-I-R3-A — semantic state tokens. One meaning per color:
        //   move     = your move / heat / primary action
        //   held     = finishing / caution / proof seal
        //   public   = publicly visible / verified-good
        //   terminal = removed / rejected / destructive
        //   waiting  = the ball is with the other party / dormant
        state: {
          move:     "#f07030",
          held:     "#f5c518",
          public:   "#34d399",
          terminal: "#e53e2a",
          waiting:  "#8b8f98",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(90deg, #e53e2a 0%, #f07030 50%, #f5c518 100%)",
        "brand-gradient-vertical":
          "linear-gradient(180deg, #e53e2a 0%, #f07030 50%, #f5c518 100%)",
        "card-overlay":
          "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.95) 100%)",
        "hero-overlay":
          "linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
        "row-fade-right":
          "linear-gradient(90deg, transparent 70%, #111111 100%)",
      },
      // Phase 10J-I-R3-A — forge depth + ember bloom. `forge-stage` stacks a
      // warm gold rim over a deep shadow for the cinematic "lit by an off-screen
      // forge" surface; `ember-glow` marks the single primary action.
      boxShadow: {
        "ember-glow":  "0 0 22px -4px rgba(240,112,48,0.6)",
        "forge-depth": "0 28px 70px -28px rgba(0,0,0,0.85)",
        "forge-stage":
          "inset 0 1px 0 0 rgba(245,197,24,0.16), 0 28px 70px -28px rgba(0,0,0,0.85)",
      },
      animation: {
        "shimmer": "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        // Cartridge settling onto the stage / sliding up the conveyor.
        "flow-in": "flow-in 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "flow-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      screens: {
        xs: "480px",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      transitionTimingFunction: {
        "premium": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
    },
  },
  plugins: [],
};

export default config;
