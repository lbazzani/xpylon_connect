import { View, Text, FlatList, TouchableOpacity, Animated } from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../components/ui/Avatar";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import { useAuthStore } from "../../../store/auth";
import type { ContactThread } from "@xpylon/shared";

const TOPIC_LABELS: Record<string, string> = {
  GENERAL: "General",
  PROFILING: "Profile setup",
  OPPORTUNITY_CREATION: "New opportunity",
  OPPORTUNITY_DISCUSSION: "Opportunity",
  SUGGESTIONS: "Suggestions",
};

const TOPIC_ICONS: Record<string, string> = {
  GENERAL: "chatbubble-outline",
  PROFILING: "person-outline",
  OPPORTUNITY_CREATION: "bulb-outline",
  OPPORTUNITY_DISCUSSION: "briefcase-outline",
  SUGGESTIONS: "sparkles-outline",
};

function ThreadItem({ thread, onPressConversation }: { thread: ContactThread; onPressConversation: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;
  const isBot = thread.contact.phone === "+10000000000";

  function toggleExpand() {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animValue, { toValue, duration: 200, useNativeDriver: false }).start();
    setExpanded(!toValue);
  }

  const lastConv = thread.conversations[0];
  const timeAgo = formatTimeAgo(thread.lastActivityAt);

  return (
    <View className="border-b border-gray-50">
      {/* Contact header row */}
      <TouchableOpacity
        onPress={thread.threadCount === 1 ? () => onPressConversation(lastConv.id) : toggleExpand}
        className="flex-row items-center px-5 py-3.5"
        activeOpacity={0.6}
      >
        <Avatar
          firstName={thread.contact.firstName}
          lastName={thread.contact.lastName}
          size="md"
          isOnline={thread.contact.isOnline}
          color={isBot ? colors.primary : undefined}
        />
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] font-semibold text-gray-900" numberOfLines={1}>
              {thread.contact.firstName} {thread.contact.lastName}
            </Text>
            <Text className="text-xs text-gray-400">{timeAgo}</Text>
          </View>
          <View className="flex-row items-center mt-0.5">
            {thread.threadCount > 1 ? (
              <>
                <Ionicons name="layers-outline" size={12} color={colors.gray400} />
                <Text className="text-xs text-gray-400 ml-1">
                  {thread.threadCount} conversations
                </Text>
              </>
            ) : (
              <Text className="text-sm text-gray-500" numberOfLines={1}>
                {lastConv.lastMessage?.content || "No messages yet"}
              </Text>
            )}
          </View>
        </View>
        {thread.threadCount > 1 && (
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.gray400}
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>

      {/* Expanded conversation list */}
      {expanded && thread.threadCount > 1 && (
        <View className="bg-gray-50 pb-1">
          {thread.conversations.map((conv: any) => {
            const topicLabel = conv.name || conv.opportunityName || TOPIC_LABELS[conv.topic] || "Chat";
            const topicIcon = TOPIC_ICONS[conv.topic] || "chatbubble-outline";
            const convTime = conv.lastMessage?.createdAt
              ? formatTimeAgo(conv.lastMessage.createdAt)
              : "";

            return (
              <TouchableOpacity
                key={conv.id}
                onPress={() => onPressConversation(conv.id)}
                className="flex-row items-center px-5 py-2.5 ml-14"
                activeOpacity={0.6}
              >
                <Ionicons name={topicIcon as any} size={16} color={colors.gray400} />
                <View className="flex-1 ml-2.5">
                  <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                    {topicLabel}
                  </Text>
                  {conv.lastMessage?.content && (
                    <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                      {conv.lastMessage.content}
                    </Text>
                  )}
                </View>
                <Text className="text-xs text-gray-300 ml-2">{convTime}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

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

export default function MessagesScreen() {
  const [threads, setThreads] = useState<ContactThread[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/conversations/grouped");
      setThreads(data.threads);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleNewOpportunity() {
    try {
      const data = await api.post("/conversations/bot-opportunity");
      router.push(`/(app)/messages/${data.conversationId}` as any);
    } catch {}
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Messages</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={handleNewOpportunity}
            className="w-9 h-9 rounded-full items-center justify-center border border-gray-200"
            activeOpacity={0.6}
          >
            <Ionicons name="bulb-outline" size={18} color={colors.gray700} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {}}
            className="w-9 h-9 rounded-full items-center justify-center border border-gray-200"
            activeOpacity={0.6}
          >
            <Ionicons name="create-outline" size={18} color={colors.gray700} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.contactId}
        onRefresh={fetchData}
        refreshing={loading}
        contentContainerStyle={threads.length === 0 && !loading ? { flex: 1 } : undefined}
        renderItem={({ item }) => (
          <ThreadItem
            thread={item}
            onPressConversation={(id) => router.push(`/(app)/messages/${id}` as any)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View className="flex-1 items-center justify-center px-12">
              <View className="w-16 h-16 rounded-2xl bg-gray-50 items-center justify-center mb-5">
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.gray300} />
              </View>
              <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
                No messages yet
              </Text>
              <Text className="text-sm text-gray-400 text-center leading-5">
                Start a conversation with one of your contacts or create a new opportunity.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
