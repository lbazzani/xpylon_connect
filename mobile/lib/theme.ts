// Xpylon Connect Design System
// ALL colors, typography, spacing referenced from here

export const colors = {
  // Brand — use sparingly for key accents only
  primary: "#F15A24",
  primaryLight: "#F47B52",
  primaryDark: "#D14A1A",

  // Professional neutrals
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
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
  green: "#10B981",
  greenLight: "#ECFDF5",
  amber: "#F59E0B",
  amberLight: "#FFFBEB",
  red: "#EF4444",
  redLight: "#FEF2F2",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",

  // Surfaces
  background: "#FFFFFF",
  backgroundSecondary: "#F9FAFB",
  surface: "#FFFFFF",
  chatBackground: "#FFFFFF",

  // Text
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  // Borders
  border: "#E5E7EB",
  borderLight: "#F3F4F6",

  // Message bubbles — professional, not colorful
  bubbleOwn: "#1B1B1B",
  bubbleOwnText: "#FFFFFF",
  bubbleOther: "#F3F4F6",
  bubbleOtherText: "#111827",
  bubbleBorder: "#E5E7EB",

  // Receipts
  receiptSent: "#9CA3AF",
  receiptRead: "#3B82F6",

  // Status
  online: "#10B981",
  offline: "#D1D5DB",
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
  "#3B82F6", // blue
  "#10B981", // green
  "#AF52DE", // purple
  "#F59E0B", // amber
  "#EF4444", // red
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
