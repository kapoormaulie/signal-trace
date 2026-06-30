import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
        // All semantic colors use CSS vars — they flip automatically on data-theme="dark"
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
        },
        ice: "var(--ice)",
        mist: "var(--mist)",
        surface: "var(--surface)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(27,30,75,0.05), 0 0 0 1px rgba(223,227,248,1)",
        "card-hover": "0 6px 20px rgba(27,30,75,0.09), 0 0 0 1px rgba(165,180,252,0.7)",
        signal: "0 4px 16px rgba(79,70,229,0.22)",
        "signal-sm": "0 2px 8px rgba(79,70,229,0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
