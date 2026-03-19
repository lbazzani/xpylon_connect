import { View, TextInput, TouchableOpacity, Text } from "react-native";
import { useState } from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("");

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <View className="flex-row items-end px-4 py-2 bg-white border-t border-gray-100">
      <TextInput
        className="flex-1 bg-background-secondary rounded-2xl px-4 py-3 text-base max-h-24"
        placeholder="Scrivi un messaggio..."
        placeholderTextColor="#9CA3AF"
        value={text}
        onChangeText={setText}
        multiline
      />
      <TouchableOpacity
        onPress={handleSend}
        className="ml-2 w-10 h-10 bg-primary rounded-full items-center justify-center"
        disabled={!text.trim()}
      >
        <Text className="text-white text-lg">{"\u2191"}</Text>
      </TouchableOpacity>
    </View>
  );
}
