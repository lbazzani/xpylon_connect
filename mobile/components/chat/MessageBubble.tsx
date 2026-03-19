import { View, Text } from "react-native";
import type { Message } from "@xpylon/shared";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  senderColor?: string;
}

export function MessageBubble({ message, isOwn, showSenderName, senderColor }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View className={`mb-2 max-w-[80%] ${isOwn ? "self-end" : "self-start"}`}>
      {showSenderName && message.sender && (
        <Text className={`text-xs font-semibold mb-0.5 ml-2`} style={{ color: senderColor || "#534AB7" }}>
          {message.sender.firstName}
        </Text>
      )}
      <View
        className={`px-4 py-2.5 ${
          isOwn
            ? "bg-primary rounded-2xl rounded-br-sm"
            : "bg-white border border-gray-100 rounded-2xl rounded-bl-sm"
        }`}
      >
        <Text className={`text-base ${isOwn ? "text-white" : "text-gray-900"}`}>
          {message.content}
        </Text>
      </View>
      <View className={`flex-row items-center mt-0.5 ${isOwn ? "justify-end mr-1" : "ml-1"}`}>
        <Text className="text-xs text-gray-400">{time}</Text>
        {isOwn && message.readAt && (
          <Text className="text-xs text-primary ml-1">{"\u2713\u2713"}</Text>
        )}
      </View>
    </View>
  );
}
