import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ContactRow } from "../../../components/rete/ContactRow";
import { PendingRequestCard } from "../../../components/rete/PendingRequestCard";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import type { Connection, User } from "@xpylon/shared";
import { useAuthStore } from "../../../store/auth";

export default function NetworkScreen() {
  const [contacts, setContacts] = useState<User[]>([]);
  const [pending, setPending] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [connData, pendData] = await Promise.all([
        api.get("/connections"),
        api.get("/connections/pending"),
      ]);
      const contactList = connData.connections.map((c: Connection) =>
        c.requesterId === currentUser?.id ? c.addressee : c.requester
      ).filter(Boolean) as User[];
      setContacts(contactList);
      setPending(pendData.connections);
    } catch {} finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAccept(id: string) {
    await api.post(`/connections/${id}/accept`);
    fetchData();
  }

  async function handleDecline(id: string) {
    await api.post(`/connections/${id}/decline`);
    fetchData();
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
        <View>
          <Text className="text-xl font-bold text-gray-900">Network</Text>
          {contacts.length > 0 && (
            <Text className="text-xs text-gray-400 mt-0.5">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {}}
          className="w-9 h-9 rounded-full items-center justify-center border border-gray-200"
          activeOpacity={0.6}
        >
          <Ionicons name="person-add-outline" size={18} color={colors.gray700} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        onRefresh={fetchData}
        refreshing={loading}
        contentContainerStyle={contacts.length === 0 && !loading ? { flex: 1 } : undefined}
        ListHeaderComponent={
          pending.length > 0 ? (
            <View className="pt-4 pb-2">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-3">
                Pending requests
              </Text>
              {pending.map((conn) => (
                <PendingRequestCard
                  key={conn.id}
                  user={conn.requester!}
                  connectionId={conn.id}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
              <View className="h-px bg-gray-100 mx-5 my-4" />
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-1">
                Your contacts
              </Text>
            </View>
          ) : contacts.length > 0 ? (
            <View className="pt-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-1">
                Your contacts
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ContactRow user={item} onPress={() => {}} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View className="flex-1 items-center justify-center px-12">
              <View className="w-16 h-16 rounded-2xl bg-gray-50 items-center justify-center mb-5">
                <Ionicons name="people-outline" size={28} color={colors.gray300} />
              </View>
              <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
                Build your network
              </Text>
              <Text className="text-sm text-gray-400 text-center leading-5">
                Invite business contacts to connect and start exploring opportunities together.
              </Text>
              <TouchableOpacity
                className="mt-6 flex-row items-center px-5 py-2.5 rounded-full border border-gray-200"
                activeOpacity={0.6}
              >
                <Ionicons name="add" size={16} color={colors.gray700} />
                <Text className="text-gray-700 font-medium text-sm ml-1.5">Invite a contact</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
