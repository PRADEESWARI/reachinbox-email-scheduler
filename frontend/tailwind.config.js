/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#EEF1F7",
          100: "#D7DCE9",
          400: "#4A5A7D",
          600: "#26324A",
          800: "#16223A",
          900: "#0F1729",
        },
        postal: {
          50: "#FBEEE9",
          100: "#F3D2C6",
          500: "#C4472C",
          600: "#A73A22",
          700: "#8A2F1B",
        },
        paper: "#F3F4F2",
        sent: "#1F8A5F",
        delayed: "#B9791F",
      },
      fontFamily: {
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
        sans: ["'Libre Franklin'", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
