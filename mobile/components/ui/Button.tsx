import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps } from "react-native";
import { colors } from "../../lib/theme";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ title, variant = "primary", size = "md", loading, disabled, className, ...props }: ButtonProps) {
  const sizeClasses = {
    sm: "py-2 px-4",
    md: "py-3.5 px-6",
    lg: "py-4 px-8",
  };
  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };
  const variants = {
    primary: "bg-primary",
    secondary: "bg-background-secondary border border-gray-200",
    danger: "bg-accent-red",
    ghost: "bg-transparent",
  };
  const textVariants = {
    primary: "text-white font-semibold",
    secondary: "text-gray-800 font-semibold",
    danger: "text-white font-semibold",
    ghost: "text-primary font-semibold",
  };

  return (
    <TouchableOpacity
      className={`rounded-xl items-center justify-center ${sizeClasses[size]} ${variants[variant]} ${disabled || loading ? "opacity-50" : ""} ${className || ""}`}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.primary : colors.white} />
      ) : (
        <Text className={`${textSizes[size]} ${textVariants[variant]}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
