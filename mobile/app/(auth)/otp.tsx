import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
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
  const [resent, setResent] = useState(false);
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
    } catch (err) {
      console.error("OTP verify error:", err);
      setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await api.post("/auth/request-otp", { phone });
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch {} finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 px-8">
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} className="py-4">
            <Text className="text-base font-medium" style={{ color: colors.primary }}>
              ← Back
            </Text>
          </TouchableOpacity>

          {/* Content */}
          <View className="flex-1 justify-center" style={{ maxWidth: 400, alignSelf: "center", width: "100%" }}>
            {/* Step indicator */}
            <View className="flex-row mb-8">
              <View className="h-1 flex-1 rounded-full mr-1" style={{ backgroundColor: colors.primary }} />
              <View className="h-1 flex-1 rounded-full ml-1 bg-gray-200" />
            </View>

            <Text className="text-2xl font-bold text-gray-900 mb-1">Verification</Text>
            <Text className="text-sm text-gray-500 mb-1 leading-5">
              Enter the 6-digit code sent to
            </Text>
            <Text className="text-sm font-semibold text-gray-800 mb-8">{phone}</Text>

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
            <View className="items-center mt-8">
              {resent ? (
                <Text className="text-sm font-medium" style={{ color: colors.green }}>
                  Code sent successfully
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={resending}>
                  <Text className="text-sm text-gray-500">
                    Didn't receive the code?{" "}
                    <Text className="font-semibold" style={{ color: colors.primary }}>
                      {resending ? "Sending..." : "Resend"}
                    </Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
