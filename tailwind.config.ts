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
        csjmu: {
          50: "#f0f4fa",
          100: "#e0e9f4",
          200: "#c4d5ea",
          300: "#98b9dc",
          400: "#6596cb",
          500: "#4177b9",
          600: "#2d5da1",
          700: "#244983",
          800: "#1b3562",
          900: "#0f2347", // Official Deep Navy Blue
          950: "#09152d", // Midnight Navy Blue
        },
        navy: {
          light: "#1e3a8a",
          DEFAULT: "#0f2347",
          dark: "#0a1832",
        },
        gold: {
          50: "#fefce8",
          100: "#fef9c3",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
        }
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "Fira Sans",
          "Droid Sans",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
