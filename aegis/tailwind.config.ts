import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: "#08090d",
        slate: "#0e1016",
        panel: "#12141c",
        rim: "#1f2230",
        rim2: "#2a2e40",
        fog: "#98a0b3",
        mist: "#c7cddb",
        allow: "#4ade9c",
        flag: "#f2b84b",
        block: "#ff6b7a",
        signal: "#8b9cff",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 rgba(255,255,255,0.03) inset, 0 20px 60px -30px rgba(0,0,0,0.8)",
        "glow-allow": "0 0 0 1px rgba(74,222,156,0.25), 0 0 60px -20px rgba(74,222,156,0.5)",
        "glow-flag": "0 0 0 1px rgba(242,184,75,0.25), 0 0 60px -20px rgba(242,184,75,0.5)",
        "glow-block": "0 0 0 1px rgba(255,107,122,0.25), 0 0 60px -20px rgba(255,107,122,0.5)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 260ms ease-out both",
        pulseDot: "pulseDot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
