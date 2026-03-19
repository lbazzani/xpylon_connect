import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useConversations } from "../../../hooks/useConversations";
import { ConversationItem } from "../../../components/chat/ConversationItem";
import { useAuthStore } from "../../../store/auth";
import { colors } from "../../../lib/theme";

type Filter = "all" | "DIRECT" | "OPPORTUNITY_GROUP";

export default function MessagesScreen() {
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
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Messages</Text>
        <TouchableOpacity
          onPress={() => {}}
          className="w-9 h-9 rounded-full items-center justify-center border border-gray-200"
          activeOpacity={0.6}
        >
          <Ionicons name="create-outline" size={18} color={colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View className="flex-row px-5 py-3 gap-2">
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full ${
              filter === f.key ? "" : "bg-gray-50"
            }`}
            style={filter === f.key ? { backgroundColor: colors.gray900 } : undefined}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${
                filter === f.key ? "text-white" : "text-gray-500"
              }`}
            >
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
        contentContainerStyle={filtered.length === 0 && !isLoading ? { flex: 1 } : undefined}
        ListEmptyComponent={
          !isLoading ? (
            <View className="flex-1 items-center justify-center px-12">
              <View className="w-16 h-16 rounded-2xl bg-gray-50 items-center justify-center mb-5">
                <Ionicons name="chatbubbles-outline" size={28} color={colors.gray300} />
              </View>
              <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
                No messages yet
              </Text>
              <Text className="text-sm text-gray-400 text-center leading-5">
                Start a conversation with one of your contacts to begin collaborating.
              </Text>
              <TouchableOpacity
                className="mt-6 flex-row items-center px-5 py-2.5 rounded-full border border-gray-200"
                activeOpacity={0.6}
              >
                <Ionicons name="add" size={16} color={colors.gray700} />
                <Text className="text-gray-700 font-medium text-sm ml-1.5">New conversation</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
