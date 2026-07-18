import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // "class" (never applied) keeps the app on the single committed
  // VitalPeps Editorial light theme and neutralizes legacy `dark:` variants
  // still present in markup.
  darkMode: "class",
  theme: {
    // Sharp corners throughout the editorial design: replace (not extend)
    // Tailwind's default border-radius scale so every `rounded-*` utility
    // resolves to 0, even if a later task forgets to strip one.
    borderRadius: {
      none: "0px",
      sm: "0px",
      DEFAULT: "0px",
      md: "0px",
      lg: "0px",
      xl: "0px",
      "2xl": "0px",
      "3xl": "0px",
      full: "0px",
    },
    extend: {
      fontFamily: {
        serif: ["Georgia", "'Times New Roman'", "serif"],
        sans: ["-apple-system", "'Helvetica Neue'", "Arial", "sans-serif"],
        mono: ["ui-monospace", "Menlo", "monospace"],
      },
      colors: {
        // VitalPeps Editorial palette — see .superpowers/sdd/global-constraints.md
        paper: "#eeece6",
        surface: "#ffffff",
        ink: "#161311",
        rust: "#a3311c",
        muted: "#8a8378",
        body: "#3a352f",
        rule: "rgba(22, 19, 17, 0.15)",
        "rule-soft": "rgba(22, 19, 17, 0.12)",
        "ev-strong": "#1a4d2e",
        "ev-moderate": "#6f5714",
        "ev-limited": "#a3311c",
        "ev-anecdotal": "#a3311c",
      },
    },
  },
  plugins: [],
};

export default config;
