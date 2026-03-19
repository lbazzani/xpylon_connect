import { TextInput, View, Text, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <View className={`mb-4 ${className || ""}`}>
      {label && <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>}
      <TextInput
        className={`bg-background-secondary rounded-xl px-4 py-3.5 text-base text-gray-900 ${
          error ? "border border-accent-red" : "border border-gray-200"
        }`}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && <Text className="text-xs text-accent-red mt-1">{error}</Text>}
    </View>
  );
}
