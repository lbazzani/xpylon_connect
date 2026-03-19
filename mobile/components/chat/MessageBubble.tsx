import { View, Text, Image, TouchableOpacity, Alert, ActionSheetIOS, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { Message } from "@xpylon/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  senderColor?: string;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageBubble({ message, isOwn, showSenderName, senderColor, onReply, onDelete }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isDeleted = !!message.deletedAt;
  const images = message.attachments?.filter((a) => a.mimeType.startsWith("image/")) || [];
  const files = message.attachments?.filter((a) => !a.mimeType.startsWith("image/")) || [];

  const getReceiptIcon = () => {
    if (!isOwn || isDeleted) return null;
    const receipts = message.receipts || [];
    const hasRead = receipts.some((r) => r.readAt);
    const hasDelivered = receipts.length > 0;
    if (hasRead) return <Text className="text-xs ml-1" style={{ color: "#3B82F6" }}>✓✓</Text>;
    if (hasDelivered) return <Text className="text-xs text-gray-400 ml-1">✓✓</Text>;
    return <Text className="text-xs text-gray-400 ml-1">✓</Text>;
  };

  function handleLongPress() {
    if (isDeleted) return;
    const options = ["Reply", "Copy"];
    if (isOwn) options.push("Delete");
    options.push("Cancel");
    const cancelIndex = options.length - 1;
    const destructiveIndex = isOwn ? options.indexOf("Delete") : -1;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        (index) => {
          if (options[index] === "Reply" && onReply) onReply(message);
          if (options[index] === "Copy" && message.content) Clipboard.setString(message.content);
          if (options[index] === "Delete" && onDelete) {
            Alert.alert("Delete message", "Delete this message for everyone?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(message.id) },
            ]);
          }
        }
      );
    } else {
      // Android fallback
      Alert.alert("Actions", undefined, [
        { text: "Reply", onPress: () => onReply?.(message) },
        { text: "Copy", onPress: () => message.content && Clipboard.setString(message.content) },
        ...(isOwn && onDelete
          ? [{ text: "Delete", style: "destructive" as const, onPress: () => {
              Alert.alert("Delete message", "Delete this message for everyone?", [
                { text: "Cancel", style: "cancel" as const },
                { text: "Delete", style: "destructive" as const, onPress: () => onDelete(message.id) },
              ]);
            }}]
          : []),
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={300}
      activeOpacity={0.7}
      className={`mb-1 max-w-[85%] ${isOwn ? "self-end" : "self-start"}`}
    >
      <View
        className={`overflow-hidden ${
          isDeleted
            ? "bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5"
            : isOwn
            ? "rounded-2xl rounded-br-[4px]"
            : "bg-gray-100 rounded-2xl rounded-bl-[4px]"
        }`}
        style={!isDeleted && isOwn ? { backgroundColor: "#1B1B1B" } : undefined}
      >
        {/* Sender name (groups only) */}
        {showSenderName && message.sender && !isDeleted && (
          <Text
            className="text-xs font-bold px-3 pt-2 pb-0"
            style={{ color: senderColor || "#F15A24" }}
          >
            {message.sender.firstName} {message.sender.lastName}
          </Text>
        )}

        {/* Reply quote */}
        {message.replyTo && !isDeleted && (
          <View className={`mx-2 mt-2 px-3 py-2 rounded-lg border-l-4 ${
            isOwn ? "bg-white/15 border-white/50" : "bg-gray-50 border-primary"
          }`}>
            <Text className={`text-xs font-bold ${isOwn ? "text-white/80" : "text-primary"}`}>
              {message.replyTo.sender?.firstName || ""}
            </Text>
            <Text
              className={`text-xs mt-0.5 ${isOwn ? "text-white/60" : "text-gray-500"}`}
              numberOfLines={2}
            >
              {message.replyTo.deletedAt ? "Message deleted" : message.replyTo.content || "Attachment"}
            </Text>
          </View>
        )}

        {isDeleted ? (
          <Text className="text-sm text-gray-400 italic">Message deleted</Text>
        ) : (
          <>
            {/* Images */}
            {images.length > 0 && (
              <View className={`${images.length === 1 ? "" : "flex-row flex-wrap"} p-1`}>
                {images.map((att) => (
                  <Image
                    key={att.id}
                    source={{ uri: `${API_URL}/storage/attachments/${att.storageObject?.variants?.medium || att.storageObject?.key}` }}
                    className={`rounded-xl ${images.length === 1 ? "w-full h-56" : "w-[48%] h-32 m-0.5"}`}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}

            {/* Files */}
            {files.map((att) => (
              <View key={att.id} className="flex-row items-center px-3 py-2">
                <View className="w-10 h-10 bg-gray-200 rounded-lg items-center justify-center mr-3">
                  <Text className="text-lg">📄</Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-medium ${isOwn ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
                    {att.fileName}
                  </Text>
                  <Text className={`text-xs ${isOwn ? "text-white/60" : "text-gray-400"}`}>
                    {formatFileSize(att.size)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Text content */}
            {message.content && (
              <Text className={`text-[15px] leading-5 px-3 ${images.length > 0 || files.length > 0 ? "pt-1" : "pt-2.5"} ${
                isOwn ? "text-white" : "text-gray-900"
              }`}>
                {message.content}
              </Text>
            )}

            {/* Time + receipt */}
            <View className={`flex-row items-center justify-end px-3 pb-1.5 pt-0.5`}>
              <Text className={`text-[11px] ${isOwn ? "text-white/50" : "text-gray-400"}`}>{time}</Text>
              {getReceiptIcon()}
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}
