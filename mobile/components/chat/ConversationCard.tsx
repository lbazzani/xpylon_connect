import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";
import type { Conversation } from "@xpylon/shared";

const TOPIC_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  GENERAL: { label: "General", icon: "chatbubble-outline", color: colors.gray500 },
  PROFILING: { label: "Profile setup", icon: "sparkles-outline", color: colors.primary },
  OPPORTUNITY_CREATION: { label: "New opportunity", icon: "bulb-outline", color: "#F59E0B" },
  OPPORTUNITY_DISCUSSION: { label: "Opportunity", icon: "briefcase-outline", color: colors.blue },
  SUGGESTIONS: { label: "Suggestions", icon: "search-outline", color: colors.green },
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ConversationCardProps {
  conversation: Conversation & { lastMessage?: any; unreadCount?: number };
  onPress: () => void;
}

export function ConversationCard({ conversation, onPress }: ConversationCardProps) {
  const conv = conversation;
  const topic = TOPIC_CONFIG[conv.topic] || TOPIC_CONFIG.GENERAL;
  const isGroup = conv.type === "OPPORTUNITY_GROUP";

  // Display name: prefer conversation name > opportunity name > topic label
  const displayName = conv.name || conv.opportunityName || topic.label;
  const timeAgo = conv.lastMessage?.createdAt ? formatTimeAgo(conv.lastMessage.createdAt) : "";
  const hasUnread = (conv.unreadCount || 0) > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center p-4 bg-white border border-gray-100 rounded-xl"
      activeOpacity={0.6}
    >
      {/* Topic icon */}
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: `${topic.color}15` }}
      >
        <Ionicons name={topic.icon as any} size={18} color={topic.color} />
      </View>

      {/* Content */}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-sm font-semibold text-gray-900 flex-shrink" numberOfLines={1}>
              {displayName}
            </Text>
            {isGroup && (
              <View className="ml-1.5 px-1.5 py-0.5 bg-blue-50 rounded">
                <Text className="text-[9px] font-medium text-blue-500">Group</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</Text>
        </View>
        {conv.lastMessage?.content && (
          <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
            {conv.lastMessage.content}
          </Text>
        )}
      </View>

      {/* Unread badge */}
      {hasUnread && (
        <View className="ml-2 min-w-[20px] h-5 rounded-full items-center justify-center px-1.5" style={{ backgroundColor: colors.primary }}>
          <Text className="text-[10px] font-bold text-white">{conv.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
