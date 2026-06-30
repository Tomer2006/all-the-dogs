/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#101820",
        panel: "#17212c",
        card: "#202b35",
        line: "rgba(255, 246, 232, 0.12)",
        ink: "#fff6e8",
        muted: "#b9c3bd",
        bark: "#f7a854",
        clay: "#d9794a",
        cream: "#263645",
        moss: "#7dbf9d",
      },
      fontFamily: {
        display: ['"Georgia"', '"Times New Roman"', "serif"],
        sans: ['"Segoe UI"', "Tahoma", "Geneva", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(0, 0, 0, 0.28)",
        card: "0 14px 32px rgba(0, 0, 0, 0.22)",
        cardHover: "0 20px 42px rgba(0, 0, 0, 0.32)",
      },
      backgroundImage: {
        glow:
          "radial-gradient(circle at top left, rgba(255, 191, 122, 0.18), transparent 38%), radial-gradient(circle at bottom right, rgba(121, 194, 160, 0.14), transparent 34%)",
      },
    },
  },
  plugins: [],
};
