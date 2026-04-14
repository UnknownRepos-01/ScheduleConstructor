import type { Config } from "tailwindcss";

const colorVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        bg: {
          primary: colorVar("--bg-primary"),
          secondary: colorVar("--bg-secondary"),
          tertiary: colorVar("--bg-tertiary"),
          card: colorVar("--bg-card"),
          sidebar: colorVar("--bg-sidebar"),
          input: colorVar("--bg-input"),
          hover: colorVar("--bg-hover"),
          active: colorVar("--bg-active"),
          badge: colorVar("--bg-badge"),
        },
        text: {
          primary: colorVar("--text-primary"),
          secondary: colorVar("--text-secondary"),
          tertiary: colorVar("--text-tertiary"),
          inverse: colorVar("--text-inverse"),
        },
        border: {
          DEFAULT: colorVar("--border"),
          light: colorVar("--border-light"),
        },
        accent: {
          primary: colorVar("--accent-primary"),
          "primary-hover": colorVar("--accent-primary-hover"),
          "primary-light": colorVar("--accent-primary-light"),
          secondary: colorVar("--accent-secondary"),
        },
        success: {
          DEFAULT: colorVar("--success"),
          light: colorVar("--success-light"),
          border: colorVar("--success-border"),
        },
        warning: {
          DEFAULT: colorVar("--warning"),
          light: colorVar("--warning-light"),
          border: colorVar("--warning-border"),
        },
        danger: {
          DEFAULT: colorVar("--danger"),
          light: colorVar("--danger-light"),
          border: colorVar("--danger-border"),
        },
        info: {
          DEFAULT: colorVar("--info"),
          light: colorVar("--info-light"),
        },
        change: {
          highlight: colorVar("--change-highlight"),
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        soft: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      backgroundImage: {
        "accent-gradient":
          "linear-gradient(135deg, rgb(var(--accent-primary)) 0%, rgb(var(--accent-secondary)) 100%)",
        "accent-gradient-hover":
          "linear-gradient(135deg, rgb(var(--accent-primary-hover)) 0%, rgb(106 74 229) 100%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -30px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.95)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 20s ease-in-out infinite",
        "float-reverse": "float 15s ease-in-out infinite reverse",
        "fade-in": "fade-in 0.2s ease",
        "slide-up": "slide-up 0.25s ease",
      },
    },
  },
  plugins: [],
};

export default config;
