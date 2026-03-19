import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit() {
    if (!phone.trim()) {
      setError("Enter your phone number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/request-otp", { phone: phone.trim() });
      router.push({ pathname: "/(auth)/otp", params: { phone: phone.trim() } });
    } catch {
      setError("Error sending code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1 px-6 justify-center"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome</Text>
        <Text className="text-base text-gray-500 mb-8">
          Enter your phone number to sign in
        </Text>
        <Input
          label="Phone number"
          placeholder="+39 333 1234567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          error={error}
          autoFocus
        />
        <Button title="Continue" onPress={handleSubmit} loading={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
