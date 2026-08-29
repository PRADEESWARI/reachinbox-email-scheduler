/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: {
          50: "#F7F7F9",
          100: "#ECEDF1",
          200: "#D6D8E0",
          400: "#8A8FA3",
          600: "#4A4F66",
          800: "#1A1D2B",
          900: "#0E1019",
          950: "#0A0B12",
        },
        gold: {
          300: "#EACD86",
          400: "#DDB861",
          500: "#C89A42",
          600: "#A67E31",
        },
        sent: "#3FBE8E",
        delayed: "#E0A952",
        danger: "#E2607A",
      },
      fontFamily: {
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(200,154,66,0.15), 0 8px 24px -8px rgba(0,0,0,0.35)",
        card: "0 1px 2px rgba(16,18,28,0.04), 0 8px 24px -12px rgba(16,18,28,0.12)",
        panel: "0 20px 60px -20px rgba(10,11,18,0.45)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #DDB861 0%, #C89A42 100%)",
        "void-gradient": "linear-gradient(180deg, #14172400 0%, #0A0B12 100%)",
      },
    },
  },
  plugins: [],
};
