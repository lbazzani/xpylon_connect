import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !companyName.trim()) return;
    setLoading(true);
    try {
      const { user } = await api.post("/auth/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        companyName: companyName.trim(),
      });
      setUser(user);
      router.replace("/(auth)/profile-setup");
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView className="flex-1 px-6" contentContainerClassName="justify-center py-12">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Create your account</Text>
          <Text className="text-base text-gray-500 mb-8">
            Enter your details to get started
          </Text>
          <Input label="First name" placeholder="John" value={firstName} onChangeText={setFirstName} />
          <Input label="Last name" placeholder="Doe" value={lastName} onChangeText={setLastName} />
          <Input
            label="Company"
            placeholder="Your company name"
            value={companyName}
            onChangeText={setCompanyName}
          />
          <Button
            title="Continue"
            onPress={handleSubmit}
            loading={loading}
            disabled={!firstName.trim() || !lastName.trim() || !companyName.trim()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
