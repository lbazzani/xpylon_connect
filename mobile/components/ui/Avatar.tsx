import { View, Text } from "react-native";
import { colors } from "../../lib/theme";

interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "round" | "square";
  color?: string;
  isOnline?: boolean;
}

const sizes = {
  sm: { container: "w-9 h-9", text: "text-xs", dot: "w-2.5 h-2.5" },
  md: { container: "w-11 h-11", text: "text-sm", dot: "w-3 h-3" },
  lg: { container: "w-16 h-16", text: "text-xl", dot: "w-3.5 h-3.5" },
  xl: { container: "w-24 h-24", text: "text-3xl", dot: "w-4 h-4" },
};

export function Avatar({ firstName, lastName, size = "md", variant = "round", color, isOnline }: AvatarProps) {
  const initials = `${(firstName || "?").charAt(0)}${(lastName || "?").charAt(0)}`.toUpperCase();
  const rounded = variant === "round" ? "rounded-full" : "rounded-xl";
  const s = sizes[size];

  return (
    <View className="relative">
      <View
        className={`${s.container} ${rounded} items-center justify-center`}
        style={{ backgroundColor: color || colors.primary }}
      >
        <Text className={`${s.text} text-white font-bold`}>{initials}</Text>
      </View>
      {isOnline !== undefined && (
        <View
          className={`absolute bottom-0 right-0 ${s.dot} rounded-full border-2 border-white`}
          style={{ backgroundColor: isOnline ? colors.online : colors.offline }}
        />
      )}
    </View>
  );
}
