import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07080a",
        panel: "#0e1116",
        line: "#1c2430",
        mute: "#8b96a8",
        ship: "#3dff9a",
        hold: "#ffc53d",
        block: "#ff5c6a",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 80px rgba(61, 255, 154, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
