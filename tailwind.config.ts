import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F6F4",
        plate: "#E9E8E5",
        ink: "#000000",
        smoke: "#6B6A68",
        oxblood: { DEFAULT: "#4A0D16", light: "#6B1A25" },
        // Rose gold from the AYCS monogram.
        rose: "#C69A90",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
