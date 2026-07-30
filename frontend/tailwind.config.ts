import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef4ff", 100: "#dbe6ff", 200: "#bcd0ff",
          300: "#8eb0ff", 400: "#5b89ff", 500: "#3566f5",
          600: "#2049db", 700: "#1a3bb0", 800: "#1a338a",
          900: "#1b2f6e", 950: "#121e47",
        },
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      boxShadow: { soft: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.04)" },
    },
  },
  plugins: [],
};
export default config;
