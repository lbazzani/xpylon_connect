import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContactRow } from "../../../components/rete/ContactRow";
import { PendingRequestCard } from "../../../components/rete/PendingRequestCard";
import { api } from "../../../lib/api";
import type { Connection, User } from "@xpylon/shared";
import { useAuthStore } from "../../../store/auth";

export default function ReteScreen() {
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

      const contactList = connData.connections.map((c: Connection) => {
        return c.requesterId === currentUser?.id ? c.addressee : c.requester;
      }).filter(Boolean) as User[];

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
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Network</Text>
        <TouchableOpacity
          onPress={() => {/* TODO: open invite sheet */}}
          className="w-10 h-10 bg-primary rounded-full items-center justify-center"
        >
          <Text className="text-white text-xl">+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        onRefresh={fetchData}
        refreshing={loading}
        ListHeaderComponent={
          pending.length > 0 ? (
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-500 uppercase px-4 mb-2">
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
              <Text className="text-sm font-semibold text-gray-500 uppercase px-4 mt-4 mb-2">
                Your contacts
              </Text>
            </View>
          ) : (
            <Text className="text-sm font-semibold text-gray-500 uppercase px-4 mb-2">
              Your contacts
            </Text>
          )
        }
        renderItem={({ item }) => (
          <ContactRow user={item} onPress={() => {/* TODO: open contact detail */}} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center py-20">
              <Text className="text-gray-400 text-base">No contacts</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
