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
          bg: "#050507",
          surface: "#111118",
          "surface-2": "#1a1a26",
          "surface-3": "#222233",
          elevated: "#2a2a3d",
          border: "rgba(255, 255, 255, 0.07)",
          "border-light": "rgba(255, 255, 255, 0.12)",
          primary: "#8b5cf6",
          "primary-light": "#a78bfa",
          "primary-muted": "rgba(139, 92, 246, 0.15)",
          accent: "#ec4899",
          "accent-muted": "rgba(236, 72, 153, 0.15)",
          "text-primary": "#f1f5f9",
          "text-secondary": "#94a3b8",
          "text-tertiary": "#64748b",
          "text-muted": "#475569",
          success: "#22c55e",
          "success-muted": "rgba(34, 197, 94, 0.15)",
          warning: "#f59e0b",
          "warning-muted": "rgba(245, 158, 11, 0.15)",
          danger: "#ef4444",
          "danger-muted": "rgba(239, 68, 68, 0.15)",
          glass: "rgba(255, 255, 255, 0.04)",
          "glass-hover": "rgba(255, 255, 255, 0.07)",
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
        "glow-sm": "0 0 20px -5px rgba(139, 92, 246, 0.15)",
        "glow-md": "0 0 40px -10px rgba(139, 92, 246, 0.2)",
        "glow-lg": "0 0 60px -15px rgba(139, 92, 246, 0.25)",
        "dark-sm": "0 2px 8px rgba(0, 0, 0, 0.3)",
        "dark-md": "0 4px 16px rgba(0, 0, 0, 0.4)",
        "dark-lg": "0 8px 32px rgba(0, 0, 0, 0.5)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-hero": "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #0a1a2e 70%, #0a0a1a 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(236, 72, 153, 0.03) 100%)",
        "gradient-primary": "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
        "gradient-accent": "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
        "gradient-text": "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)",
        "gradient-purple-pink": "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
        "gradient-mesh": "radial-gradient(at 40% 20%, rgba(139, 92, 246, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(236, 72, 153, 0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(59, 130, 246, 0.07) 0px, transparent 50%)",
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
