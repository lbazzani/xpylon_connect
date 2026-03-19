import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

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
    } catch {
    } finally {
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
        <ScrollView className="flex-1 px-6" contentContainerClassName="justify-center py-12">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Complete your profile</Text>
          <Text className="text-base text-gray-500 mb-8">You can do this later</Text>
          <Input label="Role / Position" placeholder="e.g. CEO, Sales Manager..." value={role} onChangeText={setRole} />
          <Input
            label="Bio"
            placeholder="Tell us about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={160}
          />
          <Button title="Save and continue" onPress={handleSave} loading={loading} />
          <TouchableOpacity onPress={handleSkip} className="mt-4 items-center">
            <Text className="text-primary font-medium text-base">Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
