// Xpylon Connect Design System
// ALL colors, typography, spacing referenced from here

export const colors = {
  // Brand
  primary: "#F15A24",
  primaryLight: "#F47B52",
  primaryDark: "#D14A1A",

  // Accent
  green: "#34C759",
  greenLight: "#E8F8ED",
  amber: "#FF9500",
  amberLight: "#FFF3E0",
  red: "#FF3B30",
  redLight: "#FFEBEE",
  blue: "#007AFF",
  blueLight: "#53BDEB",

  // Neutral
  white: "#FFFFFF",
  gray50: "#FAFAFA",
  gray100: "#F5F5F7",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  black: "#000000",

  // Semantic
  background: "#FFFFFF",
  backgroundSecondary: "#F5F5F7",
  chatBackground: "#ECE5DD",
  surface: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",

  // Message bubbles
  bubbleOwn: "#F15A24",
  bubbleOwnText: "#FFFFFF",
  bubbleOther: "#FFFFFF",
  bubbleOtherText: "#111827",
  bubbleBorder: "#F3F4F6",

  // Receipts
  receiptSent: "#9CA3AF",
  receiptRead: "#53BDEB",

  // Online status
  online: "#34C759",
  offline: "#9CA3AF",
} as const;

export const fonts = {
  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,

  // Weights (NativeWind classes)
  normal: "font-normal" as const,
  medium: "font-medium" as const,
  semibold: "font-semibold" as const,
  bold: "font-bold" as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// Sender colors for group chats (distinct, accessible)
export const senderColors = [
  "#F15A24", // primary orange
  "#007AFF", // blue
  "#34C759", // green
  "#AF52DE", // purple
  "#FF9500", // amber
  "#FF3B30", // red
  "#5856D6", // indigo
  "#00C7BE", // teal
  "#FF2D55", // pink
  "#5AC8FA", // light blue
] as const;

// Common shadow styles
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
} as const;
