import { TextInput, View, Text, type TextInputProps } from "react-native";
import { colors } from "../../lib/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <View className={`mb-4 ${className || ""}`}>
      {label && <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>}
      <TextInput
        className={`bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 ${
          error ? "border-2 border-accent-red" : "border border-gray-200"
        }`}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && <Text className="text-xs text-accent-red mt-1.5">{error}</Text>}
    </View>
  );
}
