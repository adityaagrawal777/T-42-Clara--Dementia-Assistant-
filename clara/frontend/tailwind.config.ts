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
        clara: {
          green: {
            900: "#2D3D2E",  // Deep forest text
            800: "#3E5E41",  // Primary brand green
            700: "#546E56",  // Secondary green
            100: "#E0EBE0",  // User bubble background
            50:  "#EEF4EE",  // Light tint
          },
          beige: {
            200: "#E5E0D8",  // Borders / hover
            100: "#F0EDE7",  // Clara bubble / pills
            50:  "#F7F5F1",  // Sidebar background
          },
          neutral: {
            bg:    "#F2F0EB",
            text:  "#2D3D2E",
            muted: "#7A8C7B",
          },
        },
      },
      fontFamily: {
        nunito:   ["var(--font-nunito)", "system-ui", "sans-serif"],
        serif:    ["var(--font-dm-serif)", "Georgia", "serif"],
        outfit:   ["var(--font-nunito)", "system-ui", "sans-serif"], // alias for compat
      },
      borderRadius: {
        "clara-bubble": "2.5rem",
      },
      boxShadow: {
        "clara-soft": "0 8px 32px -4px rgba(62, 94, 65, 0.10)",
      },
      animation: {
        "in": "fadeSlideUp 0.35s ease-out",
      },
      keyframes: {
        fadeSlideUp: {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
