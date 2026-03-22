import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import { Avatar } from "../../../components/ui/Avatar";

export default function InviteAcceptScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const router = useRouter();

  useEffect(() => { loadInvite(); }, [token]);

  async function loadInvite() {
    try {
      const data = await api.get(`/invites/${token}`);
      setInvite(data.invite);
    } catch {
      Alert.alert("Invalid invite", "This invite link is no longer valid.", [
        { text: "OK", onPress: () => router.replace("/(app)/messages" as any) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      await api.post(`/invites/${token}/accept`);
      Alert.alert(
        "Connected!",
        `You are now connected with ${invite.sender.firstName} ${invite.sender.lastName}.`,
        [{ text: "OK", onPress: () => router.replace("/(app)/network" as any) }]
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!invite) return null;

  const sender = invite.sender;
  const isExpired = invite.status !== "PENDING";

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        {/* Invite card */}
        <View className="w-full max-w-sm bg-gray-50 rounded-3xl p-8 items-center">
          <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center mb-4 border border-gray-100">
            <Ionicons name="person-add" size={28} color={colors.primary} />
          </View>

          <Text className="text-lg font-bold text-gray-900 text-center mb-2">
            Connection invite
          </Text>

          <View className="items-center my-5">
            <Avatar firstName={sender.firstName} lastName={sender.lastName} size="lg" />
            <Text className="text-base font-semibold text-gray-900 mt-3">
              {sender.firstName} {sender.lastName}
            </Text>
            {sender.role && (
              <Text className="text-sm text-gray-500 mt-0.5">{sender.role}</Text>
            )}
            {sender.company && (
              <Text className="text-sm text-gray-400">{sender.company.name}</Text>
            )}
          </View>

          <Text className="text-sm text-gray-500 text-center leading-5 mb-6">
            wants to connect with you on Xpylon Connect
          </Text>

          {isExpired ? (
            <View className="w-full py-3 rounded-xl bg-gray-200 items-center">
              <Text className="text-gray-500 font-medium text-sm">
                {invite.status === "ACCEPTED" ? "Already accepted" : "Invite expired"}
              </Text>
            </View>
          ) : (
            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={handleAccept}
                disabled={accepting}
                className="w-full py-3.5 rounded-xl items-center"
                style={{ backgroundColor: colors.gray900, opacity: accepting ? 0.5 : 1 }}
                activeOpacity={0.7}
              >
                <Text className="text-white font-semibold text-sm">
                  {accepting ? "Accepting..." : "Accept connection"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-full py-3 rounded-xl items-center border border-gray-200"
                activeOpacity={0.7}
              >
                <Text className="text-gray-500 font-medium text-sm">Not now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
