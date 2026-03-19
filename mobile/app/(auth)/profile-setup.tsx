import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image } from "react-native";
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
  const user = useAuthStore((s) => s.user);

  async function handleSave() {
    setLoading(true);
    try {
      const { user: updated } = await api.patch("/auth/profile", {
        role: role.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      setUser(updated);
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
          <View className="flex-1 px-8" style={{ maxWidth: 400, alignSelf: "center", width: "100%" }}>
            {/* Header */}
            <View className="items-center mt-8 mb-6">
              <Image
                source={require("../../assets/images/XpylonLogo_V2.png")}
                style={{ width: 100, height: 32 }}
                resizeMode="contain"
              />
            </View>

            {/* Step indicator */}
            <View className="flex-row mb-6">
              <View className="h-1 flex-1 rounded-full mr-0.5" style={{ backgroundColor: colors.primary }} />
              <View className="h-1 flex-1 rounded-full mx-0.5" style={{ backgroundColor: colors.primary }} />
              <View className="h-1 flex-1 rounded-full mx-0.5" style={{ backgroundColor: colors.primary }} />
              <View className="h-1 flex-1 rounded-full ml-0.5" style={{ backgroundColor: colors.primary }} />
            </View>

            <Text className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-2">
              Step 2 of 2
            </Text>
            <Text className="text-2xl font-bold text-gray-900 mb-1">
              Almost there{user?.firstName ? `, ${user.firstName}` : ""}!
            </Text>
            <Text className="text-sm text-gray-500 mb-6 leading-5">
              Add your professional details so others can find and connect with you.
            </Text>

            {/* Form */}
            <Input
              label="Job title"
              placeholder="e.g. CEO, Sales Director, CTO..."
              value={role}
              onChangeText={setRole}
              autoCapitalize="words"
            />

            <Input
              label="About you"
              placeholder="What do you do and what kind of business opportunities are you looking for?"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={160}
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />
            <Text className="text-xs text-gray-400 text-right -mt-2 mb-6">
              {bio.length}/160
            </Text>

            <Button title="Complete setup" onPress={handleSave} loading={loading} />

            <TouchableOpacity onPress={handleSkip} className="mt-5 items-center py-2">
              <Text className="text-sm text-gray-400">I'll do this later</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
