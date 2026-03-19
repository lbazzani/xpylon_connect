import { View, Text, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { ChatInput } from "../../../components/chat/ChatInput";
import { DateSeparator } from "../../../components/chat/DateSeparator";
import { TypingIndicator } from "../../../components/chat/TypingIndicator";
import { CallScreen } from "../../../components/chat/CallScreen";
import { colors } from "../../../lib/theme";
import type { CallType } from "@xpylon/shared";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useAuthStore } from "../../../store/auth";
import { api } from "../../../lib/api";
import type { Message, Conversation, WsServerEvent, Call } from "@xpylon/shared";

const SENDER_COLORS = ["#F15A24", "#10B981", "#3B82F6", "#AF52DE", "#F59E0B", "#EF4444", "#5856D6", "#00C7BE"];

function isSameDay(d1: string, d2: string): boolean {
  return new Date(d1).toDateString() === new Date(d2).toDateString();
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callCallerName, setCallCallerName] = useState("");
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { send } = useWebSocket(useCallback((event: WsServerEvent) => {
    if (event.type === "new_message" && event.conversationId === id) {
      setMessages((prev) => [event.message, ...prev]);
      // Auto-mark as read
      if (event.message.senderId !== user?.id) {
        send({ type: "read_message", conversationId: id!, messageId: event.message.id });
      }
    }
    if (event.type === "message_read" && event.conversationId === id) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.messageId
            ? { ...m, receipts: [...(m.receipts || []), { id: "", messageId: m.id, userId: event.userId, deliveredAt: "", readAt: event.readAt }] }
            : m
        )
      );
    }
    if (event.type === "message_delivered" && event.conversationId === id) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === event.messageId
            ? { ...m, receipts: [...(m.receipts || []), { id: "", messageId: m.id, userId: event.userId, deliveredAt: event.deliveredAt }] }
            : m
        )
      );
    }
    if (event.type === "message_deleted" && event.conversationId === id) {
      setMessages((prev) =>
        prev.map((m) => (m.id === event.messageId ? { ...m, deletedAt: new Date().toISOString(), content: undefined, attachments: [] } : m))
      );
    }
    if (event.type === "typing" && event.conversationId === id && event.userId !== user?.id) {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(event.userId, event.firstName);
        return next;
      });
      // Auto-clear after 3s
      const existing = typingTimeoutRefs.current.get(event.userId);
      if (existing) clearTimeout(existing);
      typingTimeoutRefs.current.set(
        event.userId,
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(event.userId);
            return next;
          });
        }, 3000)
      );
    }
    if (event.type === "stop_typing" && event.conversationId === id) {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(event.userId);
        return next;
      });
    }
    if (event.type === "call_incoming") {
      setActiveCall(event.call);
      setCallCallerName(event.callerName);
      setIsCallIncoming(event.call.callerId !== user?.id);
      setIsCallConnected(false);
    }
    if (event.type === "call_accepted") {
      setIsCallConnected(true);
    }
    if (event.type === "call_ended" || event.type === "call_declined") {
      setActiveCall(null);
    }
  }, [id, user?.id]));

  useEffect(() => {
    loadData();
    return () => {
      typingTimeoutRefs.current.forEach((t) => clearTimeout(t));
    };
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [convData, msgData] = await Promise.all([
        api.get("/conversations"),
        api.get(`/conversations/${id}/messages`),
      ]);
      const conv = convData.conversations.find((c: Conversation) => c.id === id);
      setConversation(conv || null);
      setMessages(msgData.messages);
      setHasMore(msgData.messages.length >= 50);

      // Mark all unread as read
      for (const msg of msgData.messages) {
        if (msg.senderId !== user?.id && !msg.receipts?.some((r: any) => r.userId === user?.id && r.readAt)) {
          send({ type: "read_message", conversationId: id!, messageId: msg.id });
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  async function loadMoreMessages() {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const lastMessage = messages[messages.length - 1];
      const data = await api.get(`/conversations/${id}/messages?cursor=${lastMessage.id}`);
      if (data.messages.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...prev, ...data.messages]);
        setHasMore(data.messages.length >= 50);
      }
    } catch {} finally {
      setLoadingMore(false);
    }
  }

  function handleSend(content: string, replyToId?: string) {
    send({ type: "send_message", conversationId: id!, content, replyToId });
  }

  function handleDelete(messageId: string) {
    send({ type: "delete_message", conversationId: id!, messageId });
  }

  function handleTyping() {
    send({ type: "typing", conversationId: id! });
  }

  function handleStopTyping() {
    send({ type: "stop_typing", conversationId: id! });
  }

  function handleStartCall(callType: string) {
    send({ type: "call_start", conversationId: id!, callType });
  }

  function handleAcceptCall() {
    if (activeCall) send({ type: "call_accept", callId: activeCall.id });
  }

  function handleDeclineCall() {
    if (activeCall) send({ type: "call_decline", callId: activeCall.id });
    setActiveCall(null);
  }

  function handleEndCall() {
    if (activeCall) send({ type: "call_end", callId: activeCall.id });
    setActiveCall(null);
  }

  const isGroup = conversation?.type === "OPPORTUNITY_GROUP";
  const otherMember = conversation?.members?.find((m) => m.userId !== user?.id)?.user;
  const title = isGroup
    ? conversation?.name || "Group"
    : otherMember
    ? `${otherMember.firstName} ${otherMember.lastName}`
    : "Chat";

  // Online/last seen subtitle
  let subtitle = "";
  if (isGroup) {
    subtitle = `${conversation?.members?.length || 0} participants`;
  } else if (otherMember) {
    if (otherMember.isOnline) {
      subtitle = "online";
    } else if (otherMember.lastSeenAt) {
      const d = new Date(otherMember.lastSeenAt);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        subtitle = `last seen today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      } else {
        subtitle = `last seen ${d.toLocaleDateString("en-US", { day: "numeric", month: "short" })} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
    }
  }

  // Typing overrides subtitle
  const typingNames = Array.from(typingUsers.values());
  if (typingNames.length > 0) {
    subtitle = typingNames.length === 1
      ? `${typingNames[0]} is typing...`
      : `${typingNames.join(", ")} are typing...`;
  }

  const senderColorMap = new Map<string, string>();
  conversation?.members?.forEach((m, i) => {
    senderColorMap.set(m.userId, SENDER_COLORS[i % SENDER_COLORS.length]);
  });

  // Build list items with date separators
  type ListItem = { type: "message"; data: Message } | { type: "date"; date: string };
  const listItems: ListItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    listItems.push({ type: "message", data: messages[i] });
    const next = messages[i + 1];
    if (next && !isSameDay(messages[i].createdAt, next.createdAt)) {
      listItems.push({ type: "date", date: messages[i].createdAt });
    }
  }
  // Add date separator for oldest message
  if (messages.length > 0) {
    listItems.push({ type: "date", date: messages[messages.length - 1].createdAt });
  }

  return (
    <SafeAreaView className="flex-1 bg-background-secondary" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-3 py-2.5 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        {isGroup ? (
          <View className="w-10 h-10 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: colors.blue }}>
            <Ionicons name="people" size={18} color={colors.white} />
          </View>
        ) : otherMember ? (
          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
            <Text className="text-white font-bold text-sm">
              {otherMember.firstName.charAt(0)}{otherMember.lastName.charAt(0)}
            </Text>
          </View>
        ) : null}
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text className={`text-xs mt-0.5 ${typingNames.length > 0 ? "text-primary" : otherMember?.isOnline ? "text-accent-green" : "text-gray-400"}`}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => handleStartCall("VOICE")}
          className="p-2 mr-1"
        >
          <Ionicons name="call-outline" size={20} color={colors.gray700} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleStartCall("VIDEO")}
          className="p-2"
        >
          <Ionicons name="videocam-outline" size={20} color={colors.gray700} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={(item, index) => item.type === "message" ? item.data.id : `date-${index}`}
            renderItem={({ item }) => {
              if (item.type === "date") {
                return <DateSeparator date={item.date} />;
              }
              return (
                <MessageBubble
                  message={item.data}
                  isOwn={item.data.senderId === user?.id}
                  showSenderName={isGroup && item.data.senderId !== user?.id}
                  senderColor={senderColorMap.get(item.data.senderId)}
                  onReply={(msg) => setReplyingTo(msg)}
                  onDelete={handleDelete}
                />
              );
            }}
            inverted
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color={colors.primary} /> : null}
          />
        )}

        {/* Typing indicator (above input) */}
        {typingNames.length > 0 && <TypingIndicator names={typingNames} />}

        <ChatInput
          onSend={handleSend}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </KeyboardAvoidingView>

      {activeCall && (
        <CallScreen
          call={activeCall}
          callerName={callCallerName}
          isIncoming={isCallIncoming}
          isConnected={isCallConnected}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onEnd={handleEndCall}
        />
      )}
    </SafeAreaView>
  );
}
