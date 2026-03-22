import { View, Text, Image, TouchableOpacity, Alert, ActionSheetIOS, Platform } from "react-native";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import type { Message } from "@xpylon/shared";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  senderColor?: string;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onViewOpportunity?: (id: string) => void;
  onSetTopic?: (topic: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Parse [OPP:uuid] markers from message content
function parseOpportunityMarkers(content: string): Array<{ type: "text"; value: string } | { type: "opp"; id: string }> {
  const parts: Array<{ type: "text"; value: string } | { type: "opp"; id: string }> = [];
  const regex = /\[OPP:([a-f0-9-]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index).trim() });
    }
    parts.push({ type: "opp", id: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) parts.push({ type: "text", value: remaining });
  }

  return parts;
}

function InlineOpportunityCard({ oppId, onView }: { oppId: string; onView?: (id: string) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      if (saved) {
        await api.delete(`/opportunities/${oppId}/save`);
        setSaved(false);
      } else {
        await api.post(`/opportunities/${oppId}/save`);
        setSaved(true);
      }
    } catch {
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-row items-center mt-1 mb-1">
      <TouchableOpacity
        onPress={() => onView?.(oppId)}
        className="flex-row items-center flex-1 py-1.5 px-2.5 bg-white/10 rounded-lg mr-1.5"
        activeOpacity={0.7}
      >
        <Ionicons name="open-outline" size={13} color="rgba(255,255,255,0.7)" />
        <Text className="text-xs text-white/70 ml-1">View details</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className="py-1.5 px-2.5 rounded-lg"
        style={{ backgroundColor: saved ? "rgba(241,90,36,0.3)" : "rgba(255,255,255,0.1)" }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={saved ? "bookmark" : "bookmark-outline"}
          size={15}
          color={saved ? colors.primary : "rgba(255,255,255,0.7)"}
        />
      </TouchableOpacity>
    </View>
  );
}

// Render bold text (**text**) as actual bold
function renderFormattedText(text: string, isOwn: boolean) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={i} className={`font-bold ${isOwn ? "text-white" : "text-gray-900"}`}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
}

export function MessageBubble({ message, isOwn, showSenderName, senderColor, onReply, onDelete, onViewOpportunity, onSetTopic }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isDeleted = !!message.deletedAt;
  const images = message.attachments?.filter((a) => a.mimeType.startsWith("image/")) || [];
  const files = message.attachments?.filter((a) => !a.mimeType.startsWith("image/")) || [];

  // Check if content has opportunity markers
  const hasOppMarkers = message.content?.includes("[OPP:") || false;
  const contentParts = hasOppMarkers && message.content
    ? parseOpportunityMarkers(message.content)
    : null;

  // Check for SET_TOPIC marker
  const topicMatch = message.content?.match(/\[SET_TOPIC:([^\]]+)\]/);
  const suggestedTopic = topicMatch?.[1];
  const cleanContentForTopic = suggestedTopic
    ? message.content!.replace(/\n*\[SET_TOPIC:[^\]]+\]/, "").trim()
    : null;

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
          if (options[index] === "Copy" && message.content) Clipboard.setString(message.content.replace(/\[OPP:[^\]]+\]/g, "").trim());
          if (options[index] === "Delete" && onDelete) {
            Alert.alert("Delete message", "Delete this message for everyone?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(message.id) },
            ]);
          }
        }
      );
    } else {
      Alert.alert("Actions", undefined, [
        { text: "Reply", onPress: () => onReply?.(message) },
        { text: "Copy", onPress: () => message.content && Clipboard.setString(message.content.replace(/\[OPP:[^\]]+\]/g, "").trim()) },
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

  // Special rendering for SET_TOPIC suggestions
  if (suggestedTopic && message.type === "SYSTEM") {
    return (
      <View className="mb-2 mx-4 self-center max-w-[90%]">
        <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#3B82F6" />
            <Text className="text-sm font-semibold text-blue-800 ml-2">Topic suggestion</Text>
          </View>
          <Text className="text-sm text-blue-700 leading-5 mb-3">{cleanContentForTopic}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => onSetTopic?.(suggestedTopic)}
              className="flex-1 py-2 rounded-lg items-center"
              style={{ backgroundColor: "#3B82F6" }}
              activeOpacity={0.7}
            >
              <Text className="text-white font-semibold text-sm">Set as topic</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-2 rounded-lg items-center border border-blue-200"
              activeOpacity={0.7}
            >
              <Text className="text-blue-500 font-medium text-sm">Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
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

            {/* Text content — with opportunity card support */}
            {message.content && (
              contentParts ? (
                <View className="px-3 pt-2.5">
                  {contentParts.map((part, idx) =>
                    part.type === "text" ? (
                      <Text
                        key={idx}
                        className={`text-[15px] leading-5 ${isOwn ? "text-white" : "text-gray-900"}`}
                      >
                        {renderFormattedText(part.value, isOwn)}
                      </Text>
                    ) : (
                      <InlineOpportunityCard
                        key={idx}
                        oppId={part.id}
                        onView={onViewOpportunity}
                      />
                    )
                  )}
                </View>
              ) : (
                <Text className={`text-[15px] leading-5 px-3 ${images.length > 0 || files.length > 0 ? "pt-1" : "pt-2.5"} ${
                  isOwn ? "text-white" : "text-gray-900"
                }`}>
                  {renderFormattedText(message.content, isOwn)}
                </Text>
              )
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
