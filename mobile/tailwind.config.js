/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#534AB7",
        "primary-light": "#6E65C9",
        "primary-dark": "#3E3494",
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
