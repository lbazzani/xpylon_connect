import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
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
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const isValid = firstName.trim() && lastName.trim() && companyName.trim();

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      const { user } = await api.post("/auth/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        companyName: companyName.trim(),
      });
      setUser(user);
      router.replace("/(auth)/profile-setup");
    } catch {
      setError("Something went wrong. Please try again.");
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
          <View className="flex-1 px-8 justify-center" style={{ maxWidth: 400, alignSelf: "center", width: "100%" }}>
            {/* Step indicator */}
            <View className="flex-row mb-8">
              <View className="h-1 flex-1 rounded-full mr-0.5" style={{ backgroundColor: colors.primary }} />
              <View className="h-1 flex-1 rounded-full mx-0.5" style={{ backgroundColor: colors.primary }} />
              <View className="h-1 flex-1 rounded-full ml-0.5 bg-gray-200" />
            </View>

            <Text className="text-2xl font-bold text-gray-900 mb-1">Create your account</Text>
            <Text className="text-sm text-gray-500 mb-8 leading-5">
              Tell us about yourself and your company.
            </Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="First name"
                  placeholder="John"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoFocus
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Last name"
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <Input
              label="Company"
              placeholder="Your company name"
              value={companyName}
              onChangeText={setCompanyName}
            />

            {error ? (
              <Text className="text-sm text-accent-red mb-4 text-center">{error}</Text>
            ) : null}

            <Button
              title="Continue"
              onPress={handleSubmit}
              loading={loading}
              disabled={!isValid}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
