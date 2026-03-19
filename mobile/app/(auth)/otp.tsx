import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  async function handleVerify() {
    if (code.length < 4) {
      setError("Enter the complete code");
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
        router.replace("/(app)/messages");
      }
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.post("/auth/request-otp", { phone });
    } catch {} finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1 px-6"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} className="mt-4 mb-8">
          <Text className="text-lg" style={{ color: colors.primary }}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View className="items-center mb-10">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-5"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <Text className="text-3xl">🔐</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            Verify your number
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            We sent a 6-digit code to{"\n"}
            <Text className="font-semibold text-gray-700">{phone}</Text>
          </Text>
        </View>

        {/* Code input */}
        <Input
          label="Verification code"
          placeholder="000000"
          keyboardType="number-pad"
          value={code}
          onChangeText={(text) => {
            setCode(text);
            if (error) setError("");
          }}
          error={error}
          maxLength={6}
          autoFocus
        />

        <Button
          title="Verify"
          onPress={handleVerify}
          loading={loading}
          disabled={code.length < 4}
        />

        {/* Resend */}
        <TouchableOpacity onPress={handleResend} disabled={resending} className="mt-6 items-center">
          <Text className="text-sm text-gray-400">
            Didn't receive the code?{" "}
            <Text style={{ color: colors.primary }} className="font-semibold">
              {resending ? "Sending..." : "Resend"}
            </Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
