import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "\"Noto Sans JP\"", "ui-sans-serif", "system-ui"],
        body: ["\"Noto Sans JP\"", "Inter", "ui-sans-serif", "system-ui"]
      },
      colors: {
        ink: "#0B0B0F",
        cloud: "#F7F4EF",
        sand: "#E8DFC9",
        sea: "#1C3C5A",
        accent: "#18A77E",
        citrus: "#F57C00",
        mint: "#10B981"
      }
    }
  },
  plugins: []
};

export default config;
