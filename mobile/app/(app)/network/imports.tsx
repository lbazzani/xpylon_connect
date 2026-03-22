import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Image, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  QUEUED: { label: "In queue", color: "#6B7280", bg: "#F3F4F6", icon: "time-outline" },
  PROCESSING: { label: "Extracting...", color: "#3B82F6", bg: "#EFF6FF", icon: "sparkles-outline" },
  EXTRACTED: { label: "Ready to send", color: "#10B981", bg: "#ECFDF5", icon: "checkmark-circle-outline" },
  CONFIRMED: { label: "Invite sent", color: "#F15A24", bg: "#FFF7ED", icon: "paper-plane-outline" },
  FAILED: { label: "Failed", color: "#DC2626", bg: "#FEE2E2", icon: "alert-circle-outline" },
  SKIPPED: { label: "Skipped", color: "#9CA3AF", bg: "#F3F4F6", icon: "close-circle-outline" },
};

export default function ImportsScreen() {
  const [imports, setImports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchImports = useCallback(async () => {
    try {
      const data = await api.get("/invites/imports");
      setImports(data.imports || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImports();
    // Poll every 3s while there are QUEUED or PROCESSING items
    pollRef.current = setInterval(() => {
      fetchImports();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchImports]);

  // Stop polling when all items are terminal
  useEffect(() => {
    const hasPending = imports.some((i) => i.status === "QUEUED" || i.status === "PROCESSING");
    if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [imports]);

  function openEditModal(item: any) {
    setEditData(item.extractedData || { firstName: "", lastName: "", role: "", company: "", phone: "", email: "" });
    setEditModal(item);
  }

  async function handleConfirm() {
    if (!editModal || !editData.phone?.trim()) {
      Alert.alert("Required", "Phone number is required to send an invite.");
      return;
    }
    setConfirming(true);
    try {
      await api.post(`/invites/imports/${editModal.id}/confirm`, editData);
      setEditModal(null);
      fetchImports();
    } catch (err) {
      Alert.alert("Error", "Failed to send invite");
    } finally {
      setConfirming(false);
    }
  }

  async function handleSkip(id: string) {
    try {
      await api.post(`/invites/imports/${id}/skip`);
      fetchImports();
    } catch {}
  }

  const processed = imports.filter((i) => !["QUEUED", "PROCESSING"].includes(i.status)).length;
  const total = imports.length;
  const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000").replace(/\/+$/, "");

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
            <Ionicons name="chevron-back" size={24} color={colors.gray900} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">Card imports</Text>
            <Text className="text-xs text-gray-400">
              {processed} of {total} processed
            </Text>
          </View>
        </View>
        {/* Progress bar */}
        {total > 0 && (
          <View className="h-1 bg-gray-100">
            <View className="h-1 bg-primary" style={{ width: `${(processed / total) * 100}%` }} />
          </View>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : imports.length === 0 ? (
        <View className="flex-1 items-center justify-center px-12">
          <Ionicons name="card-outline" size={48} color={colors.gray300} />
          <Text className="text-lg font-semibold text-gray-900 text-center mt-4">No imports</Text>
          <Text className="text-sm text-gray-400 text-center mt-1">Scan business cards from the Network tab.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {imports.map((item) => {
            const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.QUEUED;
            const data = item.extractedData;

            return (
              <View key={item.id} className="bg-white border border-gray-100 rounded-2xl mb-3 overflow-hidden">
                <View className="flex-row p-4">
                  {/* Thumbnail */}
                  <View className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 mr-3">
                    <Image
                      source={{ uri: `${apiUrl}${item.imageUrl}` }}
                      style={{ width: 64, height: 80 }}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Content */}
                  <View className="flex-1">
                    {item.status === "PROCESSING" ? (
                      <View>
                        <View className="flex-row items-center gap-2 mb-2">
                          <ActivityIndicator size="small" color="#3B82F6" />
                          <Text className="text-sm text-blue-600 font-medium">Extracting data...</Text>
                        </View>
                        <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <View className="h-full bg-blue-400 rounded-full" style={{ width: "60%" }} />
                        </View>
                      </View>
                    ) : item.status === "QUEUED" ? (
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="time-outline" size={16} color="#6B7280" />
                        <Text className="text-sm text-gray-500">Waiting in queue...</Text>
                      </View>
                    ) : data ? (
                      <View>
                        <Text className="text-sm font-semibold text-gray-900">
                          {data.firstName} {data.lastName}
                        </Text>
                        {data.role ? <Text className="text-xs text-gray-500">{data.role}</Text> : null}
                        {data.company ? <Text className="text-xs text-gray-400">{data.company}</Text> : null}
                        {data.phone ? (
                          <View className="flex-row items-center mt-1">
                            <Ionicons name="call-outline" size={11} color={colors.gray400} />
                            <Text className="text-[11px] text-gray-400 ml-1">{data.phone}</Text>
                          </View>
                        ) : null}
                        {data.email ? (
                          <View className="flex-row items-center mt-0.5">
                            <Ionicons name="mail-outline" size={11} color={colors.gray400} />
                            <Text className="text-[11px] text-gray-400 ml-1">{data.email}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : item.error ? (
                      <Text className="text-sm text-red-500">{item.error}</Text>
                    ) : null}

                    {/* Status badge */}
                    <View className="flex-row items-center mt-2">
                      <View className="flex-row items-center px-2 py-0.5 rounded-full" style={{ backgroundColor: status.bg }}>
                        <Ionicons name={status.icon as any} size={12} color={status.color} />
                        <Text className="text-[10px] font-medium ml-1" style={{ color: status.color }}>{status.label}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Action buttons for EXTRACTED items */}
                {item.status === "EXTRACTED" && (
                  <View className="flex-row border-t border-gray-50">
                    <TouchableOpacity
                      onPress={() => handleSkip(item.id)}
                      className="flex-1 py-3 items-center border-r border-gray-50"
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm text-gray-400 font-medium">Skip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openEditModal(item)}
                      className="flex-1 py-3 items-center"
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-semibold" style={{ color: colors.primary }}>Edit & Send invite</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Edit & Confirm Modal */}
      {editModal && (
        <Modal visible transparent animationType="slide">
          <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8" style={{ maxHeight: "85%" }}>
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-lg font-bold text-gray-900">Edit contact</Text>
                <TouchableOpacity onPress={() => setEditModal(null)}>
                  <Ionicons name="close" size={24} color={colors.gray400} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled">
                {[
                  { key: "firstName", label: "First name", placeholder: "First name" },
                  { key: "lastName", label: "Last name", placeholder: "Last name" },
                  { key: "role", label: "Role", placeholder: "Job title" },
                  { key: "company", label: "Company", placeholder: "Company name" },
                  { key: "phone", label: "Phone *", placeholder: "+1 555 000 0000" },
                  { key: "email", label: "Email", placeholder: "email@example.com" },
                ].map((field) => (
                  <View key={field.key} className="mb-3">
                    <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{field.label}</Text>
                    <TextInput
                      className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 border border-gray-200"
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textMuted}
                      value={editData[field.key] || ""}
                      onChangeText={(v) => setEditData((prev: any) => ({ ...prev, [field.key]: v }))}
                      keyboardType={field.key === "phone" ? "phone-pad" : field.key === "email" ? "email-address" : "default"}
                    />
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={confirming || !editData.phone?.trim()}
                className="mt-4 py-3.5 rounded-xl items-center"
                style={{ backgroundColor: colors.primary, opacity: confirming || !editData.phone?.trim() ? 0.5 : 1 }}
                activeOpacity={0.7}
              >
                <Text className="text-white font-semibold text-sm">
                  {confirming ? "Sending..." : "Send invite"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
