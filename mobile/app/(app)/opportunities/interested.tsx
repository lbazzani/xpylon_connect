import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../components/ui/Avatar";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "#D97706", bg: "#FEF3C7" },
  ACCEPTED: { label: "Accepted", color: "#059669", bg: "#ECFDF5" },
  DECLINED: { label: "Declined", color: "#DC2626", bg: "#FEE2E2" },
};

export default function InterestedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get(`/opportunities/${id}/interests`);
      setInterests(data.interests || []);
    } catch {
      Alert.alert("Error", "Failed to load interested users");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAction(userId: string, status: "ACCEPTED" | "DECLINED") {
    setActing(userId);
    try {
      const data = await api.patch(`/opportunities/${id}/interests/${userId}`, { status });
      if (data.conversationId) {
        Alert.alert(
          "Accepted",
          "A conversation has been created. Would you like to open it?",
          [
            { text: "Later", style: "cancel", onPress: fetchData },
            { text: "Open chat", onPress: () => router.push(`/(app)/messages/${data.conversationId}` as any) },
          ]
        );
      } else {
        fetchData();
      }
    } catch {
      Alert.alert("Error", `Failed to ${status.toLowerCase()} interest`);
    } finally {
      setActing(null);
    }
  }

  const pending = interests.filter((i) => i.status === "PENDING");
  const others = interests.filter((i) => i.status !== "PENDING");

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="bg-white border-b border-gray-100">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
            <Ionicons name="chevron-back" size={24} color={colors.gray900} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">Interested users</Text>
            <Text className="text-xs text-gray-400">{interests.length} total</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={[...pending, ...others]}
        keyExtractor={(item) => item.id}
        onRefresh={fetchData}
        refreshing={loading}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          pending.length > 0 ? (
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Pending approval ({pending.length})
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const u = item.user;
          const status = STATUS_STYLES[item.status] || STATUS_STYLES.PENDING;
          const isPending = item.status === "PENDING";
          const showOthersHeader = index === pending.length && others.length > 0;

          return (
            <View>
              {showOthersHeader && (
                <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-3">
                  Reviewed
                </Text>
              )}
              <View className="bg-white border border-gray-100 rounded-xl p-4 mb-2">
                <View className="flex-row items-center">
                  <Avatar firstName={u?.firstName} lastName={u?.lastName} size="md" />
                  <View className="flex-1 ml-3">
                    <Text className="text-sm font-semibold text-gray-900">
                      {u?.firstName} {u?.lastName}
                    </Text>
                    {u?.role && <Text className="text-xs text-gray-500">{u.role}</Text>}
                    {u?.company && <Text className="text-xs text-gray-400">{u.company.name}</Text>}
                  </View>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: status.bg }}>
                    <Text className="text-[10px] font-medium" style={{ color: status.color }}>{status.label}</Text>
                  </View>
                </View>

                {isPending && (
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity
                      onPress={() => handleAction(u.id, "DECLINED")}
                      disabled={acting === u.id}
                      className="flex-1 py-2.5 rounded-lg border border-gray-200 items-center"
                      activeOpacity={0.7}
                      style={{ opacity: acting === u.id ? 0.5 : 1 }}
                    >
                      <Text className="text-sm font-medium text-gray-500">Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAction(u.id, "ACCEPTED")}
                      disabled={acting === u.id}
                      className="flex-1 py-2.5 rounded-lg items-center"
                      style={{ backgroundColor: colors.green, opacity: acting === u.id ? 0.5 : 1 }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-semibold text-white">Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-16">
              <Ionicons name="people-outline" size={40} color={colors.gray300} />
              <Text className="text-base font-semibold text-gray-900 mt-4">No one yet</Text>
              <Text className="text-sm text-gray-400 mt-1">People interested in your opportunity will appear here.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
