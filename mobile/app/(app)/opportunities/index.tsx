import { View, Text, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";

type Tab = "discover" | "mine" | "saved";

const TYPE_LABELS: Record<string, string> = {
  PARTNERSHIP: "Partnership",
  DISTRIBUTION: "Distribution",
  INVESTMENT: "Investment",
  SUPPLY: "Supply",
  ACQUISITION: "Acquisition",
  OTHER: "Other",
};

const VIS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  INVITE_ONLY: { label: "Invite only", color: colors.gray600, bg: "#F3F4F6" },
  NETWORK: { label: "Network", color: colors.blue, bg: "#EFF6FF" },
  OPEN: { label: "Open", color: colors.green, bg: "#ECFDF5" },
};

const HOW_IT_WORKS = [
  {
    icon: "chatbubble-ellipses-outline",
    title: "Describe your opportunity",
    desc: "Our AI assistant will help you write a compelling listing and choose the right settings.",
  },
  {
    icon: "eye-outline",
    title: "Choose who can see it",
    desc: "Open to everyone, visible to matching professionals, or invite-only.",
  },
  {
    icon: "people-outline",
    title: "Connect with interested people",
    desc: "Review requests or let people contact you directly. Start private or group conversations.",
  },
];

function OppCard({ item, onPress }: { item: any; onPress: () => void }) {
  const vis = VIS_CONFIG[item.visibility] || VIS_CONFIG.OPEN;
  return (
    <TouchableOpacity onPress={onPress} className="mx-5 mb-3 p-4 bg-white border border-gray-100 rounded-2xl" activeOpacity={0.6}>
      <View className="flex-row items-center mb-2">
        <View className="px-2 py-0.5 rounded-md mr-2" style={{ backgroundColor: vis.bg }}>
          <Text className="text-xs font-medium" style={{ color: vis.color }}>{vis.label}</Text>
        </View>
        <Text className="text-xs text-gray-400">{TYPE_LABELS[item.type] || item.type}</Text>
      </View>
      <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={1}>{item.title}</Text>
      <Text className="text-sm text-gray-500 mb-3" numberOfLines={2}>{item.description}</Text>
      {item.tags?.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 4).map((tag: string) => (
            <View key={tag} className="px-2 py-0.5 bg-gray-50 rounded-md">
              <Text className="text-xs text-gray-500">{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="w-6 h-6 rounded-full bg-gray-200 items-center justify-center mr-2">
            <Text className="text-xs font-bold text-gray-600">
              {(item.author?.firstName || "?").charAt(0)}
            </Text>
          </View>
          <Text className="text-xs text-gray-500">
            {item.author?.firstName} {item.author?.lastName}
            {item.author?.company ? ` · ${item.author.company.name}` : ""}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="people-outline" size={14} color={colors.gray400} />
          <Text className="text-xs text-gray-400 ml-1">{item.interestedCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyDiscover({ onCreateWithAssistant }: { onCreateWithAssistant: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 }}>
      {/* Hero */}
      <View className="items-center mb-8">
        <View className="w-20 h-20 rounded-3xl bg-gray-50 items-center justify-center mb-5">
          <Ionicons name="bulb-outline" size={36} color={colors.gray300} />
        </View>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
          Business opportunities,{"\n"}right at your fingertips
        </Text>
        <Text className="text-sm text-gray-400 text-center leading-5">
          Find partnerships, investments, and deals from professionals in your network.
        </Text>
      </View>

      {/* How it works */}
      <View className="bg-gray-50 rounded-2xl p-5 mb-8">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          How it works
        </Text>
        {HOW_IT_WORKS.map((step, i) => (
          <View key={i} className="flex-row mb-4 last:mb-0">
            <View className="w-9 h-9 rounded-xl bg-white items-center justify-center mr-3 mt-0.5">
              <Ionicons name={step.icon as any} size={18} color={colors.gray500} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900 mb-0.5">{step.title}</Text>
              <Text className="text-xs text-gray-500 leading-4">{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={onCreateWithAssistant}
        className="flex-row items-center justify-center py-3.5 rounded-xl"
        style={{ backgroundColor: colors.gray900 }}
        activeOpacity={0.7}
      >
        <Ionicons name="sparkles-outline" size={18} color={colors.white} />
        <Text className="text-white font-semibold text-sm ml-2">Create with AI assistant</Text>
      </TouchableOpacity>
      <Text className="text-xs text-gray-400 text-center mt-3">
        Our assistant will guide you step by step
      </Text>
    </ScrollView>
  );
}

function EmptyMine({ onCreateWithAssistant }: { onCreateWithAssistant: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-12">
      <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center mb-5 border border-gray-100">
        <Ionicons name="briefcase-outline" size={28} color={colors.gray300} />
      </View>
      <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
        Share what you're looking for
      </Text>
      <Text className="text-sm text-gray-400 text-center leading-5">
        Describe your opportunity and let the right people come to you. Our AI assistant will help you write a great listing.
      </Text>
      <TouchableOpacity
        onPress={onCreateWithAssistant}
        className="mt-6 flex-row items-center px-5 py-2.5 rounded-full"
        style={{ backgroundColor: colors.gray900 }}
        activeOpacity={0.7}
      >
        <Ionicons name="sparkles-outline" size={16} color={colors.white} />
        <Text className="text-white font-medium text-sm ml-1.5">Create with AI assistant</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptySaved() {
  return (
    <View className="flex-1 items-center justify-center px-12">
      <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center mb-5 border border-gray-100">
        <Ionicons name="bookmark-outline" size={28} color={colors.gray300} />
      </View>
      <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
        Nothing saved yet
      </Text>
      <Text className="text-sm text-gray-400 text-center leading-5">
        Bookmark interesting opportunities to review them later.
      </Text>
    </View>
  );
}

export default function OpportunitiesScreen() {
  const [tab, setTab] = useState<Tab>("discover");
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = tab === "mine" ? "/opportunities/mine" : tab === "saved" ? "/opportunities/saved" : "/opportunities";
      const data = await api.get(endpoint);
      setOpportunities(data.opportunities || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreateWithAssistant() {
    if (creating) return;
    setCreating(true);
    try {
      const data = await api.post("/conversations/bot-opportunity");
      router.push(`/(app)/messages/${data.conversationId}` as any);
    } catch {} finally {
      setCreating(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "discover", label: "Discover" },
    { key: "mine", label: "My opps" },
    { key: "saved", label: "Saved" },
  ];

  const isEmpty = opportunities.length === 0 && !loading;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between px-5 py-4">
          <Text className="text-xl font-bold text-gray-900">Opportunities</Text>
          <TouchableOpacity
            onPress={handleCreateWithAssistant}
            disabled={creating}
            className="flex-row items-center px-3.5 py-2 rounded-full"
            style={{ backgroundColor: colors.gray900, opacity: creating ? 0.5 : 1 }}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles-outline" size={14} color={colors.white} />
            <Text className="text-white font-medium text-xs ml-1.5">
              {creating ? "Starting..." : "New"}
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row px-5 pb-3 gap-2">
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full ${tab === t.key ? "" : "bg-gray-50"}`}
              style={tab === t.key ? { backgroundColor: colors.gray900 } : undefined}
              activeOpacity={0.7}
            >
              <Text className={`text-sm font-medium ${tab === t.key ? "text-white" : "text-gray-500"}`}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isEmpty ? (
        tab === "discover" ? (
          <EmptyDiscover onCreateWithAssistant={handleCreateWithAssistant} />
        ) : tab === "mine" ? (
          <EmptyMine onCreateWithAssistant={handleCreateWithAssistant} />
        ) : (
          <EmptySaved />
        )
      ) : (
        <FlatList
          data={opportunities}
          keyExtractor={(item) => item.id}
          onRefresh={fetchData}
          refreshing={loading}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <OppCard item={item} onPress={() => router.push(`/(app)/opportunities/${item.id}` as any)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}
