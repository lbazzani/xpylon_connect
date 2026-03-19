import { View, Text, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";

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
        className="flex-1 px-6"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Logo + branding */}
        <View className="items-center mt-16 mb-12">
          <Image
            source={require("../../assets/images/XpylonLogo_V2.png")}
            className="w-48 h-16"
            resizeMode="contain"
          />
          <View className="mt-6 mb-2">
            <Text className="text-3xl font-bold text-gray-900 text-center">
              Welcome to Xpylon
            </Text>
          </View>
          <Text className="text-base text-gray-500 text-center leading-6 px-4">
            The B2B network that connects businesses.{"\n"}
            Enter your phone number to get started.
          </Text>
        </View>

        {/* Form */}
        <View className="flex-1 justify-start">
          <Input
            label="Phone number"
            placeholder="+1 (555) 123-4567"
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

          {/* Terms */}
          <Text className="text-xs text-gray-400 text-center mt-6 px-8 leading-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>

        {/* Footer */}
        <View className="items-center pb-6">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: colors.primary }} />
            <Text className="text-xs text-gray-400 font-medium">Xpylon Connect v1.0</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
