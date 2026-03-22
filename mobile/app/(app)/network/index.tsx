import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ContactRow } from "../../../components/rete/ContactRow";
import { PendingRequestCard } from "../../../components/rete/PendingRequestCard";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import type { Connection, User } from "@xpylon/shared";
import { useAuthStore } from "../../../store/auth";

const COUNTRIES = [
  { code: "IT", dial: "+39", flag: "IT" },
  { code: "US", dial: "+1", flag: "US" },
  { code: "GB", dial: "+44", flag: "GB" },
  { code: "DE", dial: "+49", flag: "DE" },
  { code: "FR", dial: "+33", flag: "FR" },
  { code: "ES", dial: "+34", flag: "ES" },
  { code: "CH", dial: "+41", flag: "CH" },
];

export default function NetworkScreen() {
  const [contacts, setContacts] = useState<User[]>([]);
  const [pending, setPending] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteCountry, setInviteCountry] = useState(COUNTRIES[0]);
  const [inviting, setInviting] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [scanning, setScanning] = useState(false);
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

  async function handleSendInvite() {
    const digits = invitePhone.replace(/[^\d]/g, "");
    if (digits.length < 6) {
      Alert.alert("Invalid number", "Please enter a valid phone number.");
      return;
    }
    const fullNumber = `${inviteCountry.dial}${digits}`;
    setInviting(true);
    try {
      await api.post("/invites", { phoneTarget: fullNumber });
      Alert.alert("Invite sent", `An invitation has been sent to ${fullNumber}.`);
      setShowInvite(false);
      setInvitePhone("");
      fetchData();
    } catch (err: any) {
      const msg = err?.message || "Failed to send invite";
      Alert.alert("Error", msg);
    } finally {
      setInviting(false);
    }
  }

  async function handleScanCards() {
    setShowAddOptions(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled || result.assets.length === 0) return;

      setScanning(true);
      const formData = new FormData();
      result.assets.forEach((asset, i) => {
        formData.append("cards", {
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: `card-${i}.jpg`,
        } as any);
      });

      await api.upload("/invites/scan", formData);
      router.push("/(app)/network/imports" as any);
    } catch (err) {
      Alert.alert("Error", "Failed to upload business cards");
    } finally {
      setScanning(false);
    }
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
          onPress={() => setShowAddOptions(true)}
          disabled={scanning}
          className="w-9 h-9 rounded-full items-center justify-center border border-gray-200"
          activeOpacity={0.6}
          style={{ opacity: scanning ? 0.5 : 1 }}
        >
          <Ionicons name={scanning ? "hourglass-outline" : "person-add-outline"} size={18} color={colors.gray700} />
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
          <ContactRow user={item} onPress={() => router.push(`/(app)/network/${item.id}` as any)} />
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
                onPress={() => setShowInvite(true)}
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

      {/* Add contact options sheet */}
      <Modal visible={showAddOptions} transparent animationType="fade">
        <TouchableOpacity className="flex-1" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} activeOpacity={1} onPress={() => setShowAddOptions(false)}>
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
              <Text className="text-lg font-bold text-gray-900 mb-4">Add contacts</Text>

              <TouchableOpacity
                onPress={() => { setShowAddOptions(false); setShowInvite(true); }}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl mb-3"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
                  <Ionicons name="call-outline" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">Enter phone number</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Send an SMS invite to a contact</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleScanCards}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center mr-3">
                  <Ionicons name="card-outline" size={20} color="#EC4899" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">Scan business cards</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">AI extracts contact info from photos</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Invite modal */}
      <Modal visible={showInvite} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={() => { setShowInvite(false); setInvitePhone(""); }}>
              <Text className="text-base text-gray-500">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-gray-900">Invite Contact</Text>
            <TouchableOpacity onPress={handleSendInvite} disabled={inviting || invitePhone.replace(/[^\d]/g, "").length < 6}>
              <Text
                className="text-base font-semibold"
                style={{ color: invitePhone.replace(/[^\d]/g, "").length >= 6 ? colors.primary : colors.gray300 }}
              >
                {inviting ? "..." : "Send"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="px-5 pt-6">
            <Text className="text-sm text-gray-500 mb-6 leading-5">
              Enter the phone number of the person you want to invite. They'll receive an SMS with a link to connect with you on Xpylon Connect.
            </Text>

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Phone number
            </Text>
            <View className="flex-row rounded-xl border border-gray-200 bg-gray-50">
              {/* Country selector */}
              <TouchableOpacity
                className="flex-row items-center px-3 border-r border-gray-200"
                activeOpacity={0.6}
                onPress={() => {
                  const idx = COUNTRIES.indexOf(inviteCountry);
                  setInviteCountry(COUNTRIES[(idx + 1) % COUNTRIES.length]);
                }}
              >
                <Text className="text-sm font-semibold text-gray-700">{inviteCountry.dial}</Text>
                <Text className="text-xs text-gray-400 ml-1">▼</Text>
              </TouchableOpacity>
              <TextInput
                className="flex-1 px-3 py-3.5 text-[15px] text-gray-900"
                placeholder="Phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={invitePhone}
                onChangeText={setInvitePhone}
                autoFocus
              />
            </View>

            <View className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <View className="flex-row items-center mb-1.5">
                <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
                <Text className="text-sm font-medium text-blue-800 ml-1.5">How invites work</Text>
              </View>
              <Text className="text-xs text-blue-700 leading-4">
                The person will receive an SMS with a link to Xpylon Connect. If they're already on the platform, you'll be connected immediately. If not, they'll be prompted to sign up and you'll be automatically connected once they do.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
