import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Image } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";
import { colors } from "../../lib/theme";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValid = firstName.trim() && lastName.trim() && emailValid && companyName.trim();

  async function handleSubmit() {
    if (!isValid) return;
    if (!emailValid) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { user } = await api.post("/auth/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        companyName: companyName.trim(),
      });
      setUser(user);
      router.replace("/(auth)/profile-setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
              <View className="h-1 flex-1 rounded-full mx-0.5 bg-gray-200" />
              <View className="h-1 flex-1 rounded-full ml-0.5 bg-gray-200" />
            </View>

            <Text className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-2">
              Step 1 of 2
            </Text>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Create your account</Text>
            <Text className="text-sm text-gray-500 mb-6 leading-5">
              We need a few details to set up your professional profile.
            </Text>

            {/* Form */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="First name *"
                  placeholder="John"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoFocus
                  autoCapitalize="words"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Last name *"
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <Input
              label="Business email *"
              placeholder="john@company.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Company *"
              placeholder="Your company name"
              value={companyName}
              onChangeText={setCompanyName}
              autoCapitalize="words"
            />

            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-sm text-red-600">{error}</Text>
              </View>
            ) : null}

            <Button
              title="Continue"
              onPress={handleSubmit}
              loading={loading}
              disabled={!isValid}
            />

            <Text className="text-xs text-gray-400 text-center mt-4">
              * Required fields
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
