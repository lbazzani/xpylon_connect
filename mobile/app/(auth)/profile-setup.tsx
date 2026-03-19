import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { colors } from "../../lib/theme";

export default function ProfileSetupScreen() {
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  async function handleSave() {
    setLoading(true);
    try {
      const { user } = await api.patch("/auth/profile", {
        role: role.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      setUser(user);
      router.replace("/(app)/messages");
    } catch {} finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    router.replace("/(app)/messages");
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-8 justify-center" style={{ maxWidth: 400, alignSelf: "center", width: "100%" }}>
            {/* Step indicator */}
            <View className="flex-row mb-8">
              <View className="h-1 flex-1 rounded-full mr-0.5" style={{ backgroundColor: colors.primary }} />
              <View className="h-1 flex-1 rounded-full mx-0.5" style={{ backgroundColor: colors.primary }} />
              <View className="h-1 flex-1 rounded-full ml-0.5" style={{ backgroundColor: colors.primary }} />
            </View>

            <Text className="text-2xl font-bold text-gray-900 mb-1">Complete your profile</Text>
            <Text className="text-sm text-gray-500 mb-8 leading-5">
              Help others understand what you do. You can always update this later.
            </Text>

            <Input
              label="Job title"
              placeholder="e.g. CEO, Sales Director, CTO..."
              value={role}
              onChangeText={setRole}
            />

            <Input
              label="About you"
              placeholder="A few words about you and what you're looking for..."
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={160}
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />

            <Text className="text-xs text-gray-400 text-right -mt-2 mb-4">
              {bio.length}/160
            </Text>

            <Button title="Save and continue" onPress={handleSave} loading={loading} />

            <TouchableOpacity onPress={handleSkip} className="mt-5 items-center py-2">
              <Text className="text-sm text-gray-500 font-medium">Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
