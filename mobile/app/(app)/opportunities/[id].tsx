import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import { useAuthStore } from "../../../store/auth";
import { Avatar } from "../../../components/ui/Avatar";

const TYPE_LABELS: Record<string, string> = {
  PARTNERSHIP: "Partnership", DISTRIBUTION: "Distribution", INVESTMENT: "Investment",
  SUPPLY: "Supply", ACQUISITION: "Acquisition", OTHER: "Other",
};

const VIS_INFO: Record<string, { label: string; desc: string; color: string; bg: string; icon: string }> = {
  NETWORK: { label: "Network", desc: "The author reviews your request before starting a conversation.", color: colors.blue, bg: "#EFF6FF", icon: "shield-outline" },
  OPEN: { label: "Open", desc: "You can contact the author directly.", color: colors.green, bg: "#ECFDF5", icon: "open-outline" },
  INVITE_ONLY: { label: "Invite only", desc: "This opportunity is shared by invitation.", color: colors.gray600, bg: "#F3F4F6", icon: "lock-closed-outline" },
};

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [opp, setOpp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthor = opp?.authorId === user?.id;

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await api.get(`/opportunities/${id}`);
      setOpp(data.opportunity);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleInterest() {
    setActing(true);
    try {
      if (opp.interestStatus) {
        await api.delete(`/opportunities/${id}/interest`);
      } else {
        const data = await api.post(`/opportunities/${id}/interest`);
        if (data.conversationId) {
          router.push(`/(app)/messages/${data.conversationId}` as any);
          return;
        }
      }
      loadData();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActing(false);
    }
  }

  async function handleSave() {
    try {
      if (opp.isSaved) {
        await api.delete(`/opportunities/${id}/save`);
      } else {
        await api.post(`/opportunities/${id}/save`);
      }
      loadData();
    } catch {}
  }

  if (loading || !opp) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">Loading...</Text>
      </SafeAreaView>
    );
  }

  const vis = VIS_INFO[opp.visibility] || VIS_INFO.OPEN;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
          <Ionicons name="chevron-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <View className="flex-1" />
        {isAuthor && (
          <TouchableOpacity onPress={() => {}} className="p-2">
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.gray600} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1">
        {/* Visibility banner */}
        <View className="mx-5 mt-4 p-3 rounded-xl flex-row items-center" style={{ backgroundColor: vis.bg }}>
          <Ionicons name={vis.icon as any} size={16} color={vis.color} />
          <Text className="text-xs ml-2 flex-1 leading-4" style={{ color: vis.color }}>{vis.desc}</Text>
        </View>

        {/* Title + type */}
        <View className="px-5 mt-4">
          <Text className="text-xs text-gray-400 uppercase tracking-wider mb-1">{TYPE_LABELS[opp.type]}</Text>
          <Text className="text-xl font-bold text-gray-900">{opp.title}</Text>
        </View>

        {/* Tags */}
        {opp.tags?.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 px-5 mt-3">
            {opp.tags.map((tag: string) => (
              <View key={tag} className="px-2.5 py-1 bg-gray-50 rounded-lg">
                <Text className="text-xs text-gray-600">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Comm mode badge */}
        <View className="px-5 mt-3">
          <View className="flex-row items-center">
            <Ionicons name={opp.commMode === "GROUP" ? "people-outline" : "chatbubble-outline"} size={14} color={colors.gray400} />
            <Text className="text-xs text-gray-400 ml-1">
              {opp.commMode === "GROUP" ? "Group conversation" : "Private conversation"}
            </Text>
          </View>
        </View>

        {/* Author */}
        <View className="flex-row items-center px-5 mt-5 pb-4 border-b border-gray-50">
          <Avatar firstName={opp.author.firstName} lastName={opp.author.lastName} size="md" />
          <View className="ml-3">
            <Text className="text-sm font-semibold text-gray-900">{opp.author.firstName} {opp.author.lastName}</Text>
            {opp.author.company && <Text className="text-xs text-gray-400">{opp.author.company.name}</Text>}
          </View>
        </View>

        {/* Description */}
        <View className="px-5 py-4">
          <Text className="text-sm text-gray-700 leading-5">{opp.description}</Text>
        </View>

        {/* Stats */}
        <View className="flex-row mx-5 gap-3 mb-6">
          <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
            <Text className="text-lg font-bold text-gray-900">{opp.interestedCount || 0}</Text>
            <Text className="text-xs text-gray-400">Interested</Text>
          </View>
          <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
            <Text className="text-lg font-bold text-gray-900">{opp.acceptedCount || 0}</Text>
            <Text className="text-xs text-gray-400">Accepted</Text>
          </View>
        </View>

        {/* Interest status panel */}
        {opp.interestStatus === "PENDING" && (
          <View className="mx-5 mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <Text className="text-sm text-amber-700 font-medium">Request sent</Text>
            <Text className="text-xs text-amber-600 mt-1">The author will review your request and get back to you.</Text>
          </View>
        )}
        {opp.interestStatus === "ACCEPTED" && (
          <View className="mx-5 mb-4 p-4 bg-green-50 border border-green-100 rounded-xl">
            <Text className="text-sm text-green-700 font-medium">You're in!</Text>
            <Text className="text-xs text-green-600 mt-1">Your interest has been accepted. Check your messages.</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {!isAuthor && (
        <View className="px-5 py-4 border-t border-gray-100 bg-white">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleSave}
              className="w-12 h-12 rounded-xl border border-gray-200 items-center justify-center"
              activeOpacity={0.6}
            >
              <Ionicons name={opp.isSaved ? "bookmark" : "bookmark-outline"} size={20} color={opp.isSaved ? colors.primary : colors.gray500} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleInterest}
              disabled={acting || opp.interestStatus === "ACCEPTED"}
              className={`flex-1 h-12 rounded-xl items-center justify-center ${opp.interestStatus ? "" : ""}`}
              style={{
                backgroundColor: opp.interestStatus === "PENDING" ? colors.gray100 : opp.interestStatus === "ACCEPTED" ? colors.green : colors.gray900,
                opacity: acting ? 0.5 : 1,
              }}
              activeOpacity={0.7}
            >
              <Text className={`font-semibold text-sm ${opp.interestStatus === "PENDING" ? "text-gray-600" : "text-white"}`}>
                {opp.interestStatus === "PENDING" ? "Withdraw request" : opp.interestStatus === "ACCEPTED" ? "Accepted" : "I'm interested"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isAuthor && (
        <View className="px-5 py-4 border-t border-gray-100 bg-white">
          <TouchableOpacity
            onPress={() => {}}
            className="h-12 rounded-xl border border-gray-200 items-center justify-center"
            activeOpacity={0.6}
          >
            <Text className="font-medium text-sm text-gray-700">Manage interested ({opp.interestedCount || 0})</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
