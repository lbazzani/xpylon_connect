import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";
import { useAuth } from "../../hooks/useAuth";
import { Avatar } from "../../components/ui/Avatar";

interface DemoUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role?: string;
  bio?: string;
  industry?: string;
  company?: { name: string };
}

export default function DemoPickScreen() {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    fetchDemoUsers();
  }, []);

  async function fetchDemoUsers() {
    try {
      const data = await api.get("/auth/demo-users");
      setUsers(data.users || []);
    } catch {
      Alert.alert("Error", "Failed to load demo accounts");
    } finally {
      setLoading(false);
    }
  }

  async function handlePickUser(user: DemoUser) {
    setLoggingIn(user.id);
    try {
      // Request OTP (skipped in demo mode)
      await api.post("/auth/request-otp", { phone: user.phone, isDemo: true });
      // Verify with fixed demo code
      const data = await api.post("/auth/verify-otp", {
        phone: user.phone,
        code: "116261",
        isDemo: true,
      });
      await login(data.accessToken, data.refreshToken, true);
      router.replace("/(app)/messages" as any);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoggingIn(null);
    }
  }

  function handleCreateNew() {
    router.push({
      pathname: "/(auth)/otp",
      params: { phone: "", isDemo: "true", isNewDemo: "true" },
    } as any);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-5 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
          <Ionicons name="chevron-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-bold text-gray-900">Demo Mode</Text>
        </View>
      </View>

      {/* Explanation */}
      <View className="mx-5 mb-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
        <View className="flex-row items-center mb-2">
          <Ionicons name="information-circle-outline" size={18} color="#3B82F6" />
          <Text className="text-sm font-semibold text-blue-800 ml-1.5">How it works</Text>
        </View>
        <Text className="text-xs text-blue-700 leading-4">
          Demo mode lets you explore Xpylon Connect with sample data. You'll see demo users, conversations, and opportunities — completely isolated from real accounts. No SMS or emails are sent.
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Choose an account
        </Text>

        {loading ? (
          <View className="items-center py-12">
            <Text className="text-gray-400">Loading demo accounts...</Text>
          </View>
        ) : (
          <>
            {users.map((user) => (
              <TouchableOpacity
                key={user.id}
                onPress={() => handlePickUser(user)}
                disabled={loggingIn !== null}
                className="flex-row items-center p-4 mb-2.5 bg-white border border-gray-100 rounded-2xl"
                style={{ opacity: loggingIn && loggingIn !== user.id ? 0.5 : 1 }}
                activeOpacity={0.6}
              >
                <Avatar firstName={user.firstName} lastName={user.lastName} size="md" />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {user.role}{user.company ? ` at ${user.company.name}` : ""}
                  </Text>
                  {user.industry && (
                    <Text className="text-xs text-gray-400 mt-0.5">{user.industry}</Text>
                  )}
                </View>
                {loggingIn === user.id ? (
                  <Text className="text-xs text-gray-400">Signing in...</Text>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                )}
              </TouchableOpacity>
            ))}

            {/* Create new demo account */}
            <View className="mt-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Or create a new demo account
              </Text>
              <TouchableOpacity
                onPress={handleCreateNew}
                disabled={loggingIn !== null}
                className="flex-row items-center justify-center p-4 border border-dashed border-gray-200 rounded-2xl"
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.gray500} />
                <Text className="text-sm font-medium text-gray-500 ml-2">Create demo account</Text>
              </TouchableOpacity>
              <Text className="text-xs text-gray-400 text-center mt-2">
                Enter any phone number — verification code is 116261
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
