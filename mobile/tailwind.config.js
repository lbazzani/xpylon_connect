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
          green: "#34C759",
          amber: "#FF9500",
          red: "#FF3B30",
          blue: "#007AFF",
        },
        background: {
          DEFAULT: "#FFFFFF",
          secondary: "#F5F5F7",
          chat: "#ECE5DD",
        },
      },
      fontSize: {
        "2xs": "11px",
      },
    },
  },
  plugins: [],
};
