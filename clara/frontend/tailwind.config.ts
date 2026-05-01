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
          bg: "#faf7f2",
          surface: "#ffffff",
          "surface-2": "#f5f0e8",
          "surface-3": "#ede6d8",
          elevated: "#e5dace",
          border: "rgba(130, 100, 70, 0.14)",
          "border-light": "rgba(130, 100, 70, 0.22)",
          primary: "#6b9e8c",
          "primary-light": "#89b5a2",
          "primary-muted": "rgba(107, 158, 140, 0.15)",
          accent: "#c97b5a",
          "accent-muted": "rgba(201, 123, 90, 0.15)",
          "text-primary": "#2c1f14",
          "text-secondary": "#5a3d2b",
          "text-tertiary": "#8a6a52",
          "text-muted": "#b09078",
          warm: "#7a5a40",
          success: "#5a9668",
          "success-muted": "rgba(90, 150, 104, 0.15)",
          warning: "#c47c28",
          "warning-muted": "rgba(196, 124, 40, 0.15)",
          danger: "#bc4e3e",
          "danger-muted": "rgba(188, 78, 62, 0.15)",
          glass: "rgba(130, 100, 70, 0.04)",
          "glass-hover": "rgba(130, 100, 70, 0.07)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-serif)", "serif"],
        serif: ["var(--font-serif)", "serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "glow-sm": "0 2px 12px rgba(107, 158, 140, 0.22)",
        "glow-md": "0 4px 20px rgba(107, 158, 140, 0.28)",
        "glow-lg": "0 8px 30px rgba(107, 158, 140, 0.32)",
        "dark-sm": "0 1px 6px rgba(80, 50, 30, 0.08)",
        "dark-md": "0 3px 12px rgba(80, 50, 30, 0.10)",
        "dark-lg": "0 6px 24px rgba(80, 50, 30, 0.13)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.70)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-hero": "linear-gradient(135deg, #f0ebe2 0%, #ede0ce 30%, #e8ded0 70%, #f0ebe2 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(107, 158, 140, 0.07) 0%, rgba(201, 123, 90, 0.04) 100%)",
        "gradient-primary": "linear-gradient(135deg, #6b9e8c 0%, #89b5a2 100%)",
        "gradient-accent": "linear-gradient(135deg, #c97b5a 0%, #d9957a 100%)",
        "gradient-text": "linear-gradient(135deg, #2c1f14 0%, #5a3d2b 100%)",
        "gradient-purple-pink": "linear-gradient(135deg, #6b9e8c 0%, #c97b5a 100%)",
        "gradient-mesh": "radial-gradient(at 40% 20%, rgba(107, 158, 140, 0.09) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(201, 123, 90, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(107, 140, 188, 0.05) 0px, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
