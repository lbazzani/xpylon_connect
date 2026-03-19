import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps } from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
}

export function Button({ title, variant = "primary", loading, disabled, className, ...props }: ButtonProps) {
  const base = "rounded-xl py-3.5 px-6 items-center justify-center";
  const variants = {
    primary: "bg-primary",
    secondary: "bg-background-secondary border border-gray-200",
    danger: "bg-accent-red",
    ghost: "bg-transparent",
  };
  const textVariants = {
    primary: "text-white font-semibold text-base",
    secondary: "text-gray-800 font-semibold text-base",
    danger: "text-white font-semibold text-base",
    ghost: "text-primary font-semibold text-base",
  };

  return (
    <TouchableOpacity
      className={`${base} ${variants[variant]} ${disabled || loading ? "opacity-50" : ""} ${className || ""}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? "#534AB7" : "#fff"} />
      ) : (
        <Text className={textVariants[variant]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
