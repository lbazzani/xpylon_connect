import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../../components/ui/Avatar";
import { ConversationCard } from "../../../../components/chat/ConversationCard";
import { api } from "../../../../lib/api";
import { colors } from "../../../../lib/theme";
import type { Conversation, User, ContactThread } from "@xpylon/shared";

export default function ContactThreadsScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const [contact, setContact] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Get grouped threads and find this contact's thread
      const data = await api.get("/conversations/grouped");
      const thread = data.threads.find((t: ContactThread) => t.contactId === contactId);
      if (thread) {
        setContact(thread.contact);
        setConversations(thread.conversations);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleNewTopic() {
    Alert.prompt(
      "New conversation",
      `Start a new topic with ${contact?.firstName || "this contact"}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async (name) => {
            try {
              const data = await api.post("/conversations/new-topic", {
                contactId,
                name: name?.trim() || null,
              });
              router.push(`/(app)/messages/${data.conversation.id}` as any);
            } catch {
              Alert.alert("Error", "Failed to create conversation");
            }
          },
        },
      ],
      "plain-text",
      ""
    );
  }

  const isBot = contact?.phone === "+10000000000";

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header with contact info */}
      <View className="bg-white border-b border-gray-100">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
            <Ionicons name="chevron-back" size={24} color={colors.gray900} />
          </TouchableOpacity>
          {contact && (
            <>
              {isBot ? (
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.primary }}>
                  <Ionicons name="sparkles" size={18} color={colors.white} />
                </View>
              ) : (
                <Avatar firstName={contact.firstName} lastName={contact.lastName} size="md" isOnline={contact.isOnline} />
              )}
              <View className="flex-1 ml-1">
                <Text className="text-base font-semibold text-gray-900">
                  {contact.firstName} {contact.lastName}
                </Text>
                <Text className="text-xs text-gray-400">
                  {isBot ? "Your AI assistant" : contact.company?.name || contact.role || ""}
                  {!isBot && contact.isOnline ? " · online" : ""}
                </Text>
              </View>
            </>
          )}
          {!isBot && (
            <TouchableOpacity
              onPress={handleNewTopic}
              className="w-9 h-9 rounded-full items-center justify-center border border-gray-200 ml-2"
              activeOpacity={0.6}
            >
              <Ionicons name="add" size={18} color={colors.gray700} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversations list */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        onRefresh={fetchData}
        refreshing={loading}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </Text>
        }
        renderItem={({ item }) => (
          <ConversationCard
            conversation={item}
            onPress={() => router.push(`/(app)/messages/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="chatbubble-outline" size={32} color={colors.gray300} />
              <Text className="text-sm text-gray-400 mt-2">No conversations yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
