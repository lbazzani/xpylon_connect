import { View, Text } from "react-native";

interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: "sm" | "md" | "lg";
  variant?: "round" | "square";
  color?: string;
}

const sizes = { sm: "w-10 h-10", md: "w-12 h-12", lg: "w-20 h-20" };
const textSizes = { sm: "text-sm", md: "text-base", lg: "text-2xl" };

export function Avatar({ firstName, lastName, size = "md", variant = "round", color = "bg-primary" }: AvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const rounded = variant === "round" ? "rounded-full" : "rounded-lg";

  return (
    <View className={`${sizes[size]} ${rounded} ${color} items-center justify-center`}>
      <Text className={`${textSizes[size]} text-white font-bold`}>{initials}</Text>
    </View>
  );
}
