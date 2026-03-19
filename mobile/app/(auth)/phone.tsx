import { View, Text, KeyboardAvoidingView, Platform, Image, Dimensions } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function normalizePhone(input: string): string {
    const digits = input.replace(/[^+\d]/g, "");
    if (digits.startsWith("+")) return digits;
    // Default to Italian prefix if no country code
    return `+39${digits}`;
  }

  async function handleSubmit() {
    if (!phone.trim()) {
      setError("Enter your phone number");
      return;
    }
    const normalized = normalizePhone(phone.trim());
    if (normalized.length < 10) {
      setError("Phone number is too short");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/request-otp", { phone: normalized });
      router.push({ pathname: "/(auth)/otp", params: { phone: normalized } });
    } catch {
      setError("Error sending code");
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
        <View className="flex-1 px-8 justify-between">
          {/* Top: Logo + tagline */}
          <View className="items-center" style={{ marginTop: SCREEN_HEIGHT * 0.08 }}>
            <Image
              source={require("../../assets/images/XpylonLogo_V2.png")}
              style={{ width: 140, height: 44 }}
              resizeMode="contain"
            />
            <Text className="text-sm text-gray-400 mt-3 tracking-widest uppercase font-medium">
              Business Networking
            </Text>
          </View>

          {/* Center: Form */}
          <View className="flex-1 justify-center" style={{ maxWidth: 400, alignSelf: "center", width: "100%" }}>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Sign in</Text>
            <Text className="text-sm text-gray-500 mb-8 leading-5">
              Enter your phone number and we'll send you a verification code.
            </Text>

            <Input
              label="Phone number"
              placeholder="+39 348 123 4567"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (error) setError("");
              }}
              error={error}
              autoFocus
            />

            <Button
              title="Continue"
              onPress={handleSubmit}
              loading={loading}
              disabled={!phone.trim()}
            />
          </View>

          {/* Bottom: Footer */}
          <View className="items-center pb-6">
            <Text className="text-xs text-gray-400 text-center leading-4 mb-4" style={{ maxWidth: 280 }}>
              By continuing, you agree to our{" "}
              <Text className="text-gray-500 font-medium">Terms of Service</Text>
              {" "}and{" "}
              <Text className="text-gray-500 font-medium">Privacy Policy</Text>
            </Text>
            <View className="w-10 h-0.5 rounded-full bg-gray-200" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
