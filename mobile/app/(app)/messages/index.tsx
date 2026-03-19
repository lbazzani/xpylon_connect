import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useConversations } from "../../../hooks/useConversations";
import { ConversationItem } from "../../../components/chat/ConversationItem";
import { useAuthStore } from "../../../store/auth";
import type { ConversationType } from "@xpylon/shared";

type Filter = "all" | "DIRECT" | "OPPORTUNITY_GROUP";

export default function MessaggiScreen() {
  const { conversations, isLoading, refetch } = useConversations();
  const [filter, setFilter] = useState<Filter>("all");
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const filtered =
    filter === "all" ? conversations : conversations.filter((c) => c.type === filter);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "DIRECT", label: "Direct" },
    { key: "OPPORTUNITY_GROUP", label: "Groups" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Messages</Text>
        <TouchableOpacity
          onPress={() => {/* TODO: open new conversation sheet */}}
          className="w-10 h-10 bg-primary rounded-full items-center justify-center"
        >
          <Text className="text-white text-xl">+</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row px-4 mb-2 gap-2">
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full ${
              filter === f.key ? "bg-primary" : "bg-background-secondary"
            }`}
          >
            <Text className={`text-sm font-medium ${filter === f.key ? "text-white" : "text-gray-600"}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            currentUserId={user?.id || ""}
            onPress={() => router.push(`/(app)/messages/${item.id}`)}
          />
        )}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-400 text-base">No conversations</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
