import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../components/ui/Avatar";
import { useAuth } from "../../../hooks/useAuth";
import { colors } from "../../../lib/theme";

export default function ProfiloScreen() {
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  }

  if (!user) return null;

  const menuItems = [
    { label: "Edit profile", iconName: "create-outline" as const, color: colors.primary },
    { label: "My company", iconName: "business-outline" as const, color: colors.blue },
    { label: "Notifications", iconName: "notifications-outline" as const, color: colors.green },
    { label: "Privacy & security", iconName: "shield-outline" as const, color: colors.gray600 },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1">
        <View className="items-center pt-8 pb-6">
          <Avatar firstName={user.firstName} lastName={user.lastName} size="lg" />
          <Text className="text-xl font-bold text-gray-900 mt-3">
            {user.firstName} {user.lastName}
          </Text>
          {user.company && (
            <Text className="text-base text-gray-500 mt-0.5">{user.company.name}</Text>
          )}
          <View
            className={`mt-2 px-3 py-1 rounded-full ${
              user.profileCompleted ? "bg-green-100" : "bg-amber-100"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                user.profileCompleted ? "text-green-700" : "text-amber-700"
              }`}
            >
              {user.profileCompleted ? "Profile complete" : "Complete profile"}
            </Text>
          </View>
        </View>

        <View className="px-4">
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              className="flex-row items-center py-4 border-b border-gray-100"
            >
              <View className="mr-3">
                <Ionicons name={item.iconName} size={20} color={item.color} />
              </View>
              <Text className="text-base font-medium text-gray-900 flex-1">{item.label}</Text>
              <Text className="text-gray-300 text-lg">{"\u203A"}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center py-4"
          >
            <View className="mr-3">
              <Ionicons name="log-out-outline" size={20} color={colors.red} />
            </View>
            <Text className="text-base font-medium" style={{ color: colors.red }}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
