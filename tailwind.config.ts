import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // "class" (never applied) keeps the app on the single committed Swiss Deco
  // light theme and neutralizes legacy `dark:` variants in the markup.
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-oswald)", "Oswald", "sans-serif"],
      },
      colors: {
        // Swiss Deco palette
        ink: "#1a1613",
        cream: "#f2ead9",
        rust: { DEFAULT: "#c9481f", dark: "#a83c19" },
        sage: "#a9a196",
        brown: "#a9764f",
        muted: "#6b6459",
        body: "#3a352f",
        // Legacy accent scale remapped to rust so existing `brand-*` usage
        // adopts the new accent without touching every call site.
        brand: {
          50: "#faf0e9",
          100: "#f4dccf",
          200: "#e9b69c",
          300: "#e0a184",
          400: "#d5714b",
          500: "#c9481f",
          600: "#c9481f",
          700: "#a83c19",
          800: "#8f3315",
          900: "#742a11",
        },
      },
    },
  },
  plugins: [],
};

export default config;
