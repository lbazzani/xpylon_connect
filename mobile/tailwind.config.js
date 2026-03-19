/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#F15A24",
          light: "#F47B52",
          dark: "#D14A1A",
        },
        accent: {
          green: "#10B981",
          amber: "#F59E0B",
          red: "#EF4444",
          blue: "#3B82F6",
        },
        background: {
          DEFAULT: "#FFFFFF",
          secondary: "#F9FAFB",
        },
      },
      fontSize: {
        "2xs": "11px",
      },
    },
  },
  plugins: [],
};
