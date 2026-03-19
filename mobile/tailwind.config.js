/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#F15A24",
        "primary-light": "#F47B52",
        "primary-dark": "#D14A1A",
        accent: {
          green: "#34C759",
          amber: "#FF9500",
          red: "#FF3B30",
        },
        background: {
          DEFAULT: "#FFFFFF",
          secondary: "#F5F5F7",
        },
      },
    },
  },
  plugins: [],
};
