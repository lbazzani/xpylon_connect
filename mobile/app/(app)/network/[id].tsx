import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import { Avatar } from "../../../components/ui/Avatar";
import type { User } from "@xpylon/shared";

const TYPE_LABELS: Record<string, string> = {
  PARTNERSHIP: "Partnership", DISTRIBUTION: "Distribution", INVESTMENT: "Investment",
  SUPPLY: "Supply", ACQUISITION: "Acquisition", OTHER: "Other",
};

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contact, setContact] = useState<User | null>(null);
  const [shared, setShared] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [connData, sharedData] = await Promise.all([
        api.get("/connections"),
        api.get(`/connections/${id}/shared`),
      ]);
      // Find the contact from connections
      const conn = connData.connections.find((c: any) =>
        c.requesterId === id || c.addresseeId === id
      );
      if (conn) {
        setContact(conn.requesterId === id ? conn.requester : conn.addressee);
      }
      setShared(sharedData);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleMessage() {
    try {
      const data = await api.post("/conversations/direct", { contactId: id });
      router.push(`/(app)/messages/${data.conversation.id}` as any);
    } catch (err) {
      Alert.alert("Error", "Failed to open conversation");
    }
  }

  if (loading || !contact) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">Loading...</Text>
      </SafeAreaView>
    );
  }

  const allOpps = [
    ...(shared?.myOpportunities || []).map((o: any) => ({ ...o, relation: "Their interest in your opportunity" })),
    ...(shared?.theirOpportunities || []).map((o: any) => ({ ...o, relation: "Your interest in their opportunity" })),
    ...(shared?.mutualInterests || []).map((o: any) => ({ ...o, relation: "Mutual interest" })),
  ];

  const conversations = shared?.conversations || [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
          <Ionicons name="chevron-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-gray-900 flex-1">Contact</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Profile card */}
        <View className="items-center pt-6 pb-5 border-b border-gray-50">
          <Avatar firstName={contact.firstName} lastName={contact.lastName} size="xl" />
          <Text className="text-xl font-bold text-gray-900 mt-3">
            {contact.firstName} {contact.lastName}
          </Text>
          {contact.role && (
            <Text className="text-sm text-gray-500 mt-0.5">{contact.role}</Text>
          )}
          {contact.company && (
            <Text className="text-sm text-gray-400 mt-0.5">{contact.company.name}</Text>
          )}
          {contact.bio && (
            <Text className="text-sm text-gray-500 mt-3 px-8 text-center leading-5">{contact.bio}</Text>
          )}

          {/* Action buttons */}
          <View className="flex-row gap-3 mt-5 px-8">
            <TouchableOpacity
              onPress={handleMessage}
              className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
              style={{ backgroundColor: colors.gray900 }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.white} />
              <Text className="text-white font-semibold text-sm ml-2">Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // Find or create direct conversation, then start call
                handleMessage();
              }}
              className="w-12 items-center justify-center rounded-xl border border-gray-200"
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Shared opportunities */}
        {allOpps.length > 0 && (
          <View className="px-5 pt-5">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Shared opportunities
            </Text>
            {allOpps.map((opp: any) => (
              <TouchableOpacity
                key={opp.id}
                onPress={() => router.push(`/(app)/opportunities/${opp.id}` as any)}
                className="mb-2.5 p-3.5 bg-gray-50 border border-gray-100 rounded-xl"
                activeOpacity={0.6}
              >
                <View className="flex-row items-center mb-1.5">
                  <Text className="text-xs text-gray-400">{TYPE_LABELS[opp.type] || opp.type}</Text>
                  {opp.interestStatus && (
                    <View
                      className="ml-auto px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: opp.interestStatus === "ACCEPTED" ? "#ECFDF5" : "#FEF3C7" }}
                    >
                      <Text className="text-[10px] font-medium" style={{ color: opp.interestStatus === "ACCEPTED" ? colors.green : "#D97706" }}>
                        {opp.interestStatus}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-sm font-semibold text-gray-900 mb-0.5" numberOfLines={1}>{opp.title}</Text>
                <Text className="text-xs text-gray-400">{opp.relation}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Conversations */}
        {conversations.length > 0 && (
          <View className="px-5 pt-5 pb-8">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Conversations
            </Text>
            {conversations.map((conv: any) => (
              <TouchableOpacity
                key={conv.id}
                onPress={() => router.push(`/(app)/messages/${conv.id}` as any)}
                className="flex-row items-center mb-2.5 p-3.5 bg-gray-50 border border-gray-100 rounded-xl"
                activeOpacity={0.6}
              >
                <Ionicons
                  name={conv.type === "OPPORTUNITY_GROUP" ? "people" : "chatbubble-ellipses"}
                  size={16}
                  color={colors.gray500}
                />
                <View className="flex-1 ml-2.5">
                  <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                    {conv.opportunityName || conv.name || "Direct message"}
                  </Text>
                  {conv.lastMessage && (
                    <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                      {conv.lastMessage.content || "Attachment"}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.gray300} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty state */}
        {allOpps.length === 0 && conversations.length === 0 && (
          <View className="items-center py-12 px-12">
            <Ionicons name="layers-outline" size={32} color={colors.gray300} />
            <Text className="text-sm text-gray-400 text-center mt-3 leading-5">
              No shared opportunities or conversations yet. Send a message to start collaborating.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
