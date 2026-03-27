/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#08111a",
        ink: "#f5ead7",
        bark: "#f1a15d",
        clay: "#ffbf7a",
        cream: "#122232",
        moss: "#79c2a0",
      },
      fontFamily: {
        display: ['"Georgia"', '"Times New Roman"', "serif"],
        sans: ['"Segoe UI"', "Tahoma", "Geneva", "sans-serif"],
      },
      boxShadow: {
        soft: "0 30px 80px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        glow:
          "radial-gradient(circle at top left, rgba(255, 191, 122, 0.18), transparent 38%), radial-gradient(circle at bottom right, rgba(121, 194, 160, 0.14), transparent 34%)",
      },
    },
  },
  plugins: [],
};
