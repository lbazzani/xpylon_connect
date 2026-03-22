import { View, Text, FlatList, TouchableOpacity, Modal } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../components/ui/Avatar";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import type { ContactThread, Connection, User } from "@xpylon/shared";
import { useAuthStore } from "../../../store/auth";

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

function ThreadRow({ thread, onPress }: { thread: ContactThread; onPress: () => void }) {
  const isBot = thread.contact.phone === "+10000000000";
  const lastConv = thread.conversations[0];
  const timeAgo = formatTimeAgo(thread.lastActivityAt);
  const lastMsg = lastConv?.lastMessage?.content || "No messages yet";
  const totalUnread = thread.conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-5 py-3.5 border-b border-gray-50 ${isBot ? "bg-gray-50/50" : ""}`}
      activeOpacity={0.6}
    >
      {/* Avatar */}
      {isBot ? (
        <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.primary }}>
          <Ionicons name="sparkles" size={20} color={colors.white} />
        </View>
      ) : (
        <View className="mr-3">
          <Avatar
            firstName={thread.contact.firstName}
            lastName={thread.contact.lastName}
            size="md"
            isOnline={thread.contact.isOnline}
          />
        </View>
      )}

      {/* Content */}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-[15px] font-semibold text-gray-900" numberOfLines={1}>
              {thread.contact.firstName} {thread.contact.lastName}
            </Text>
            {/* Thread count badge */}
            {thread.threadCount > 1 && (
              <View className="ml-1.5 w-5 h-5 rounded-full bg-gray-200 items-center justify-center">
                <Text className="text-[10px] font-bold text-gray-600">{thread.threadCount}</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-gray-400">{timeAgo}</Text>
        </View>

        <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
          {isBot ? "Your AI assistant" : lastMsg}
        </Text>
      </View>

      {/* Unread badge or chevron */}
      {totalUnread > 0 ? (
        <View className="ml-2 min-w-[20px] h-5 rounded-full items-center justify-center px-1.5" style={{ backgroundColor: colors.primary }}>
          <Text className="text-[10px] font-bold text-white">{totalUnread}</Text>
        </View>
      ) : thread.threadCount > 1 ? (
        <Ionicons name="chevron-forward" size={14} color={colors.gray300} style={{ marginLeft: 8 }} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const [threads, setThreads] = useState<ContactThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [contacts, setContacts] = useState<User[]>([]);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

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

  async function handleCompose() {
    try {
      const data = await api.get("/connections");
      const contactList = data.connections.map((c: Connection) =>
        c.requesterId === currentUser?.id ? c.addressee : c.requester
      ).filter(Boolean) as User[];
      setContacts(contactList);
      setShowCompose(true);
    } catch {}
  }

  async function handleSelectContact(contactId: string) {
    setShowCompose(false);
    try {
      const data = await api.post("/conversations/new-topic", { contactId });
      router.push(`/(app)/messages/${data.conversation.id}` as any);
    } catch {}
  }

  async function handleNewOpportunity() {
    try {
      const data = await api.post("/conversations/bot-opportunity");
      router.push(`/(app)/messages/${data.conversationId}` as any);
    } catch {}
  }

  function handleThreadPress(thread: ContactThread) {
    const isBot = thread.contact.phone === "+10000000000";

    if (thread.threadCount === 1 && !isBot) {
      // Single conversation, non-bot → go directly to chat
      router.push(`/(app)/messages/${thread.conversations[0].id}` as any);
    } else {
      // Multiple conversations or bot → go to thread screen
      router.push(`/(app)/messages/contact/${thread.contactId}` as any);
    }
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
            onPress={handleCompose}
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
          <ThreadRow thread={item} onPress={() => handleThreadPress(item)} />
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

      {/* Compose — contact picker */}
      <Modal visible={showCompose} transparent animationType="fade">
        <TouchableOpacity className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setShowCompose(false)}>
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8" style={{ maxHeight: "60%" }}>
              <Text className="text-lg font-bold text-gray-900 mb-4">New conversation</Text>
              <FlatList
                data={contacts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectContact(item.id)}
                    className="flex-row items-center py-3 border-b border-gray-50"
                    activeOpacity={0.6}
                  >
                    <Avatar firstName={item.firstName} lastName={item.lastName} size="sm" />
                    <View className="flex-1 ml-3">
                      <Text className="text-sm font-medium text-gray-900">{item.firstName} {item.lastName}</Text>
                      {item.company && <Text className="text-xs text-gray-400">{(item.company as any).name || ""}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.gray300} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="items-center py-8">
                    <Text className="text-sm text-gray-400">No contacts yet. Add contacts from the Network tab.</Text>
                  </View>
                }
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
