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
      animation: {
        "shimmer": "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
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
