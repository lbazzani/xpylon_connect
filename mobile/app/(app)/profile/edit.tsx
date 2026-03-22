import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import { colors } from "../../../lib/theme";
import { useAuthStore } from "../../../store/auth";
import { Avatar } from "../../../components/ui/Avatar";
import { CompanyPicker } from "../../../components/ui/CompanyPicker";

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [role, setRole] = useState(user?.role || "");
  const [industry, setIndustry] = useState(user?.industry || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(
    user?.company ? { id: user.companyId || "", name: user.company.name } : null
  );
  const [loading, setLoading] = useState(false);

  const hasChanges =
    firstName !== (user?.firstName || "") ||
    lastName !== (user?.lastName || "") ||
    role !== (user?.role || "") ||
    industry !== (user?.industry || "") ||
    bio !== (user?.bio || "") ||
    selectedCompany?.id !== (user?.companyId || "") ||
    (selectedCompany && !selectedCompany.id && selectedCompany.name !== (user?.company?.name || ""));

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Required", "First name and last name are required.");
      return;
    }
    setLoading(true);
    try {
      const body: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role.trim(),
        industry: industry.trim(),
        bio: bio.trim(),
      };

      // Handle company change
      if (selectedCompany) {
        if (selectedCompany.id) {
          // Selected existing company
          body.companyId = selectedCompany.id;
        } else {
          // New company name — create via API first
          const { company } = await api.post("/users/companies", { name: selectedCompany.name });
          body.companyId = company.id;
        }
      }

      const { user: updated } = await api.patch("/users/me", body);
      setUser(updated);
      router.back();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (hasChanges) {
      Alert.alert("Discard changes?", "You have unsaved changes.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={handleCancel}>
          <Text className="text-base text-gray-500">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-gray-900">Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={!hasChanges || loading}>
          <Text
            className="text-base font-semibold"
            style={{ color: hasChanges ? colors.primary : colors.gray300 }}
          >
            {loading ? "..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* Avatar section */}
          <View className="items-center py-6">
            <Avatar firstName={firstName} lastName={lastName} size="xl" />
          </View>

          {/* Form */}
          <View className="px-5">
            {/* First name */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              First name
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 border border-gray-200 mb-4"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            {/* Last name */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Last name
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 border border-gray-200 mb-4"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            {/* Company */}
            <View style={{ zIndex: 100 }}>
              <CompanyPicker
                value={user.company?.name || ""}
                selectedId={user.companyId || undefined}
                onSelect={setSelectedCompany}
                label="Company"
              />
            </View>

            {/* Role */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Job title
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 border border-gray-200 mb-4"
              value={role}
              onChangeText={setRole}
              placeholder="e.g. CEO, Sales Director, CTO..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            {/* Industry */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Industry
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 border border-gray-200 mb-4"
              value={industry}
              onChangeText={setIndustry}
              placeholder="e.g. Technology, Finance, Manufacturing..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            {/* Bio */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              About you
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3.5 text-[15px] text-gray-900 border border-gray-200 mb-1"
              value={bio}
              onChangeText={setBio}
              placeholder="What do you do and what kind of opportunities interest you?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={300}
              style={{ minHeight: 100, textAlignVertical: "top" }}
            />
            <Text className="text-xs text-gray-400 text-right mb-4">{bio.length}/300</Text>

            {/* Non-editable info */}
            <View className="mt-2 mb-8">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Account info
              </Text>
              <View className="flex-row items-center py-3 border-b border-gray-50">
                <Ionicons name="mail-outline" size={16} color={colors.gray400} />
                <Text className="text-sm text-gray-500 ml-2.5">{user.email || "No email"}</Text>
              </View>
              <View className="flex-row items-center py-3 border-b border-gray-50">
                <Ionicons name="call-outline" size={16} color={colors.gray400} />
                <Text className="text-sm text-gray-500 ml-2.5">{user.phone}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
