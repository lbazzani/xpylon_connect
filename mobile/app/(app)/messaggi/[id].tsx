import { View, Text, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { ChatInput } from "../../../components/chat/ChatInput";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useAuthStore } from "../../../store/auth";
import { api } from "../../../lib/api";
import type { Message, Conversation, WsServerEvent } from "@xpylon/shared";

const SENDER_COLORS = ["#534AB7", "#34C759", "#FF9500", "#FF3B30", "#007AFF", "#AF52DE"];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const { send } = useWebSocket((event: WsServerEvent) => {
    if (event.type === "new_message" && event.conversationId === id) {
      setMessages((prev) => [event.message, ...prev]);
    }
    if (event.type === "message_read" && event.conversationId === id) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.messageId ? { ...m, readAt: new Date().toISOString() } : m
        )
      );
    }
  });

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [convData, msgData] = await Promise.all([
        api.get("/conversations"),
        api.get(`/conversations/${id}/messages`),
      ]);
      const conv = convData.conversations.find((c: Conversation) => c.id === id);
      setConversation(conv || null);
      setMessages(msgData.messages);
    } catch {}
  }

  function handleSend(content: string) {
    send({ type: "send_message", conversationId: id!, content });
  }

  const isGroup = conversation?.type === "OPPORTUNITY_GROUP";
  const otherMember = conversation?.members?.find((m) => m.userId !== user?.id)?.user;
  const title = isGroup
    ? conversation?.name || "Gruppo"
    : otherMember
    ? `${otherMember.firstName} ${otherMember.lastName}`
    : "Chat";
  const subtitle = isGroup
    ? `${conversation?.members?.length || 0} partecipanti`
    : otherMember?.company?.name || "";

  const senderColorMap = new Map<string, string>();
  conversation?.members?.forEach((m, i) => {
    senderColorMap.set(m.userId, SENDER_COLORS[i % SENDER_COLORS.length]);
  });

  return (
    <SafeAreaView className="flex-1 bg-background-secondary" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-primary text-2xl">{"\u2039"}</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
          {subtitle ? <Text className="text-sm text-gray-500">{subtitle}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.senderId === user?.id}
              showSenderName={isGroup && item.senderId !== user?.id}
              senderColor={senderColorMap.get(item.senderId)}
            />
          )}
          inverted
          contentContainerStyle={{ padding: 16 }}
        />
        <ChatInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
