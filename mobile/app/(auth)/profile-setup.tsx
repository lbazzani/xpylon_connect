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
      router.replace("/(app)/messaggi");
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    router.replace("/(app)/messaggi");
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView className="flex-1 px-6" contentContainerClassName="justify-center py-12">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Completa il profilo</Text>
          <Text className="text-base text-gray-500 mb-8">Puoi farlo anche dopo</Text>
          <Input label="Ruolo / Posizione" placeholder="es. CEO, Sales Manager..." value={role} onChangeText={setRole} />
          <Input
            label="Bio"
            placeholder="Raccontaci di te in poche parole..."
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={160}
          />
          <Button title="Salva e continua" onPress={handleSave} loading={loading} />
          <TouchableOpacity onPress={handleSkip} className="mt-4 items-center">
            <Text className="text-primary font-medium text-base">Salta per ora</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
