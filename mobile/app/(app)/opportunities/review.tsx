import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import { Avatar } from "../../../components/ui/Avatar";

const TYPE_LABELS: Record<string, string> = {
  PARTNERSHIP: "Partnership", DISTRIBUTION: "Distribution", INVESTMENT: "Investment",
  SUPPLY: "Supply", ACQUISITION: "Acquisition", OTHER: "Other",
};

export default function AdminReviewScreen() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingData, statsData] = await Promise.all([
        api.get("/admin/opportunities/pending"),
        api.get("/admin/stats"),
      ]);
      setOpportunities(pendingData.opportunities || []);
      setStats(statsData);
    } catch (err) {
      Alert.alert("Error", "Failed to load review queue. Make sure you have admin access.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleApprove(id: string) {
    setActing(true);
    try {
      await api.patch(`/admin/opportunities/${id}/approve`, {});
      Alert.alert("Approved", "The opportunity is now live.");
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Failed to approve");
    } finally {
      setActing(false);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      Alert.alert("Required", "Please provide a reason for rejection.");
      return;
    }
    setActing(true);
    try {
      await api.patch(`/admin/opportunities/${id}/reject`, { reason: rejectReason.trim() });
      Alert.alert("Rejected", "The author has been notified.");
      setRejectReason("");
      setExpanded(null);
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Failed to reject");
    } finally {
      setActing(false);
    }
  }

  async function handleChat(id: string) {
    try {
      const data = await api.post(`/admin/opportunities/${id}/chat`);
      router.push(`/(app)/messages/${data.conversationId}` as any);
    } catch (err) {
      Alert.alert("Error", "Failed to open conversation");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
            <Ionicons name="chevron-back" size={24} color={colors.gray900} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">Compliance Review</Text>
            <Text className="text-xs text-gray-400">
              {opportunities.length} pending {opportunities.length === 1 ? "review" : "reviews"}
            </Text>
          </View>
        </View>

        {/* Stats bar */}
        {stats && (
          <View className="flex-row px-4 pb-3 gap-3">
            <View className="flex-1 bg-amber-50 rounded-lg p-2 items-center">
              <Text className="text-lg font-bold text-amber-700">{stats.pendingCount}</Text>
              <Text className="text-[10px] text-amber-600">Pending</Text>
            </View>
            <View className="flex-1 bg-green-50 rounded-lg p-2 items-center">
              <Text className="text-lg font-bold text-green-700">{stats.approvedToday}</Text>
              <Text className="text-[10px] text-green-600">Approved today</Text>
            </View>
            <View className="flex-1 bg-red-50 rounded-lg p-2 items-center">
              <Text className="text-lg font-bold text-red-700">{stats.rejectedToday}</Text>
              <Text className="text-[10px] text-red-600">Rejected today</Text>
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Loading...</Text>
        </View>
      ) : opportunities.length === 0 ? (
        <View className="flex-1 items-center justify-center px-12">
          <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center mb-5 border border-gray-100">
            <Ionicons name="checkmark-circle-outline" size={28} color={colors.green} />
          </View>
          <Text className="text-lg font-semibold text-gray-900 text-center mb-2">All clear</Text>
          <Text className="text-sm text-gray-400 text-center">No opportunities pending review.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 12 }}>
          {opportunities.map((opp) => (
            <View key={opp.id} className="mx-4 mb-3 bg-white border border-gray-100 rounded-2xl overflow-hidden">
              {/* Flagged reason */}
              <View className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                <View className="flex-row items-center">
                  <Ionicons name="warning-outline" size={14} color="#D97706" />
                  <Text className="text-xs font-medium text-amber-700 ml-1.5">Flagged: {opp.reviewNote}</Text>
                </View>
              </View>

              {/* Content */}
              <View className="p-4">
                {/* Author */}
                <View className="flex-row items-center mb-3">
                  <Avatar firstName={opp.author?.firstName} lastName={opp.author?.lastName} size="sm" />
                  <View className="ml-2">
                    <Text className="text-sm font-medium text-gray-900">
                      {opp.author?.firstName} {opp.author?.lastName}
                    </Text>
                    {opp.author?.company && (
                      <Text className="text-xs text-gray-400">{opp.author.company.name}</Text>
                    )}
                  </View>
                  <Text className="ml-auto text-xs text-gray-300">
                    {new Date(opp.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {/* Opportunity details */}
                <Text className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                  {TYPE_LABELS[opp.type] || opp.type}
                </Text>
                <Text className="text-base font-semibold text-gray-900 mb-1">{opp.title}</Text>
                <Text className="text-sm text-gray-600 mb-3 leading-5">{opp.description}</Text>

                {opp.tags?.length > 0 && (
                  <View className="flex-row flex-wrap gap-1 mb-3">
                    {opp.tags.map((tag: string) => (
                      <View key={tag} className="px-2 py-0.5 bg-gray-50 rounded-md">
                        <Text className="text-xs text-gray-500">{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action buttons */}
                <View className="flex-row gap-2 mt-1">
                  <TouchableOpacity
                    onPress={() => handleApprove(opp.id)}
                    disabled={acting}
                    className="flex-1 py-2.5 rounded-xl items-center justify-center"
                    style={{ backgroundColor: colors.green, opacity: acting ? 0.5 : 1 }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                      <Text className="text-white font-semibold text-sm ml-1">Approve</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setExpanded(expanded === opp.id ? null : opp.id)}
                    className="flex-1 py-2.5 rounded-xl items-center justify-center border"
                    style={{ borderColor: "#DC2626" }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="close" size={16} color="#DC2626" />
                      <Text className="font-semibold text-sm ml-1" style={{ color: "#DC2626" }}>Reject</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleChat(opp.id)}
                    className="w-11 py-2.5 rounded-xl items-center justify-center border border-gray-200"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color={colors.gray600} />
                  </TouchableOpacity>
                </View>

                {/* Reject reason input */}
                {expanded === opp.id && (
                  <View className="mt-3">
                    <TextInput
                      className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 border border-gray-200"
                      placeholder="Reason for rejection (required)..."
                      placeholderTextColor={colors.textMuted}
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      multiline
                      style={{ minHeight: 60, textAlignVertical: "top" }}
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => handleReject(opp.id)}
                      disabled={acting || !rejectReason.trim()}
                      className="mt-2 py-2.5 rounded-xl items-center"
                      style={{ backgroundColor: "#DC2626", opacity: acting || !rejectReason.trim() ? 0.5 : 1 }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-white font-semibold text-sm">Confirm rejection</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
