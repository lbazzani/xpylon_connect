import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  async function handleVerify() {
    if (code.length < 4) {
      setError("Inserisci il codice completo");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/auth/verify-otp", { phone, code });
      await login(data.accessToken, data.refreshToken);
      if (data.isNewUser) {
        router.replace("/(auth)/register");
      } else {
        router.replace("/(app)/messaggi");
      }
    } catch {
      setError("Codice non valido");
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
        <Text className="text-3xl font-bold text-gray-900 mb-2">Verifica</Text>
        <Text className="text-base text-gray-500 mb-8">
          Inserisci il codice inviato a {phone}
        </Text>
        <Input
          label="Codice OTP"
          placeholder="123456"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          error={error}
          maxLength={6}
          autoFocus
        />
        <Button title="Verifica" onPress={handleVerify} loading={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
