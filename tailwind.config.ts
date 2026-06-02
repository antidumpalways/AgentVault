import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0A0E27",
          900: "#0F1335",
          800: "#1A2040",
          700: "#2A3060",
          600: "#3A4080",
        },
        cyan: {
          400: "#22D3EE",
          500: "#00D9FF",
          600: "#00B8D9",
        },
        purple: {
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        emerald: {
          500: "#10B981",
          600: "#059669",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        md: "6px",
        lg: "8px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(0, 217, 255, 0.1)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 217, 255, 0.2)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
