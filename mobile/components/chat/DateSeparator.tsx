import { View, Text } from "react-native";

interface DateSeparatorProps {
  date: string;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <View className="items-center my-3">
      <View className="bg-white/90 px-4 py-1 rounded-lg shadow-sm border border-gray-100">
        <Text className="text-xs text-gray-500 font-medium">{formatDateLabel(date)}</Text>
      </View>
    </View>
  );
}
