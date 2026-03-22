import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Avatar } from "../../../components/ui/Avatar";
import { useAuth } from "../../../hooks/useAuth";
import { colors } from "../../../lib/theme";
import { ProductTour } from "../../../components/onboarding/ProductTour";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const router = useRouter();

  function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  }

  if (!user) return null;

  const menuItems = [
    { label: "Edit profile", subtitle: "Update your information", iconName: "create-outline" as const, color: colors.primary, onPress: () => router.push("/(app)/profile/edit" as any) },
    { label: "My company", subtitle: user.company?.name || "Add company details", iconName: "business-outline" as const, color: colors.blue, onPress: () => router.push("/(app)/profile/edit" as any) },
    { label: "Notifications", subtitle: "Manage your preferences", iconName: "notifications-outline" as const, color: colors.green, onPress: () => Linking.openSettings() },
    { label: "Privacy policy", subtitle: "How we handle your data", iconName: "shield-outline" as const, color: colors.gray500, onPress: () => {
      const baseUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000").replace(/\/+$/, "");
      Linking.openURL(`${baseUrl}/privacy`);
    }},
    { label: "How it works", subtitle: "Learn about Xpylon Connect", iconName: "information-circle-outline" as const, color: colors.blue, onPress: () => setShowTour(true) },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-xl font-bold text-gray-900">Profile</Text>
        </View>

        {/* Profile card */}
        <View className="mx-5 mt-5 p-5 bg-gray-50 rounded-2xl">
          <View className="flex-row items-center">
            <Avatar firstName={user.firstName} lastName={user.lastName} size="lg" />
            <View className="flex-1 ml-4">
              <Text className="text-lg font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </Text>
              {user.role && (
                <Text className="text-sm text-gray-500 mt-0.5">{user.role}</Text>
              )}
              {user.company && (
                <Text className="text-sm text-gray-400 mt-0.5">{user.company.name}</Text>
              )}
            </View>
            <View
              className="px-2.5 py-1 rounded-full"
              style={{ backgroundColor: user.profileCompleted ? "#ECFDF5" : "#FFFBEB" }}
            >
              <Ionicons
                name={user.profileCompleted ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={user.profileCompleted ? colors.green : colors.amber}
              />
            </View>
          </View>
          {user.bio && (
            <Text className="text-sm text-gray-600 mt-3 leading-5">{user.bio}</Text>
          )}
          {user.email && (
            <View className="flex-row items-center mt-3">
              <Ionicons name="mail-outline" size={14} color={colors.gray400} />
              <Text className="text-xs text-gray-400 ml-1.5">{user.email}</Text>
            </View>
          )}
          {user.phone && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="call-outline" size={14} color={colors.gray400} />
              <Text className="text-xs text-gray-400 ml-1.5">{user.phone}</Text>
            </View>
          )}
        </View>

        {/* Menu */}
        <View className="mx-5 mt-6">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Settings
          </Text>
          {menuItems.map((item: any) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              className="flex-row items-center py-3.5 border-b border-gray-50"
              activeOpacity={0.6}
            >
              <View
                className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: `${item.color}10` }}
              >
                <Ionicons name={item.iconName} size={18} color={item.color} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-gray-900">{item.label}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleLogout}
          className="mx-5 mt-8 mb-8 py-3.5 items-center rounded-xl border border-gray-200"
          activeOpacity={0.6}
        >
          <Text className="text-sm font-medium" style={{ color: colors.red }}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      {showTour && (
        <ProductTour
          mode="menu"
          visible={showTour}
          onDismiss={() => setShowTour(false)}
        />
      )}
    </SafeAreaView>
  );
}
