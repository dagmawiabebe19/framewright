import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fw: {
          base: "#080808",
          surface: "#0f0f0f",
          elevated: "#1a1a1a",
          hover: "#222222",
          active: "#2a2a2a",
          gold: "#D4A853",
          "gold-hover": "#E0B86A",
          "gold-muted": "#8B6914",
          "gold-bg": "#1a1200",
          "gold-border": "#3d2e00",
          text: {
            primary: "#F5F0E8",
            secondary: "#A09880",
            muted: "#5a5040",
          },
          border: "#2a2a2a",
          "border-strong": "#3a3a3a",
          success: "#4CAF7D",
          "success-bg": "#0a1a10",
          danger: "#E05252",
          "danger-bg": "#1a0808",
          info: "#6BA3BE",
          "info-bg": "#081218",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
