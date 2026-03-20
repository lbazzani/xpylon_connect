import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import { Button } from "../../../components/ui/Button";

const TYPES = [
  { key: "PARTNERSHIP", label: "Partnership" },
  { key: "DISTRIBUTION", label: "Distribution" },
  { key: "INVESTMENT", label: "Investment" },
  { key: "SUPPLY", label: "Supply" },
  { key: "ACQUISITION", label: "Acquisition" },
  { key: "OTHER", label: "Other" },
];

const VISIBILITIES = [
  { key: "OPEN", label: "Open", desc: "Anyone can contact you directly" },
  { key: "NETWORK", label: "Network", desc: "You review requests before starting a conversation" },
  { key: "INVITE_ONLY", label: "Invite only", desc: "Only people you share it with can see it" },
];

const COMM_MODES = [
  { key: "PRIVATE", label: "Private chats", desc: "Separate conversation with each person" },
  { key: "GROUP", label: "Group chat", desc: "One conversation with all accepted participants" },
];

function ChipSelect({ options, value, onChange }: { options: { key: string; label: string; desc?: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-1">
      {options.map((o) => (
        <TouchableOpacity
          key={o.key}
          onPress={() => onChange(o.key)}
          className={`px-4 py-2 rounded-xl border ${value === o.key ? "border-gray-900" : "border-gray-200"}`}
          style={value === o.key ? { backgroundColor: colors.gray900 } : undefined}
          activeOpacity={0.6}
        >
          <Text className={`text-sm font-medium ${value === o.key ? "text-white" : "text-gray-600"}`}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function NewOpportunityScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("");
  const [commMode, setCommMode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValid = title.trim() && type && visibility && commMode;
  const selectedVis = VISIBILITIES.find((v) => v.key === visibility);
  const selectedComm = COMM_MODES.find((c) => c.key === commMode);

  async function handlePublish() {
    if (!isValid) return;
    setLoading(true);
    try {
      await api.post("/opportunities", {
        title: title.trim(),
        description: description.trim(),
        type,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        visibility,
        commMode,
      });
      router.back();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-gray-500">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-gray-900">New Opportunity</Text>
        <TouchableOpacity onPress={handlePublish} disabled={!isValid || loading}>
          <Text className="text-base font-semibold" style={{ color: isValid ? colors.primary : colors.gray300 }}>
            {loading ? "..." : "Publish"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Title *</Text>
        <TextInput
          className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 border border-gray-200 mb-5"
          placeholder="e.g. Looking for distribution partners in Europe"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* Type */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Type *</Text>
        <ChipSelect options={TYPES} value={type} onChange={setType} />
        <View className="mb-5" />

        {/* Description */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</Text>
        <TextInput
          className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 border border-gray-200 mb-1"
          placeholder="Describe the opportunity..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
          style={{ minHeight: 100, textAlignVertical: "top" }}
        />
        <Text className="text-xs text-gray-400 text-right mb-5">{description.length}/500</Text>

        {/* Tags */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</Text>
        <TextInput
          className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 border border-gray-200 mb-5"
          placeholder="automotive, europe, b2b (comma separated)"
          placeholderTextColor={colors.textMuted}
          value={tags}
          onChangeText={setTags}
        />

        {/* Visibility */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Visibility *</Text>
        <ChipSelect options={VISIBILITIES} value={visibility} onChange={setVisibility} />
        {selectedVis && (
          <Text className="text-xs text-gray-400 mt-1 mb-5">{selectedVis.desc}</Text>
        )}

        {/* Comm mode */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Communication *</Text>
        <ChipSelect options={COMM_MODES} value={commMode} onChange={setCommMode} />
        {selectedComm && (
          <Text className="text-xs text-gray-400 mt-1 mb-5">{selectedComm.desc}</Text>
        )}

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}
