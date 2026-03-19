import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "../../../components/ui/Avatar";
import { useAuth } from "../../../hooks/useAuth";

export default function ProfiloScreen() {
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert("Esci", "Vuoi davvero uscire?", [
      { text: "Annulla", style: "cancel" },
      { text: "Esci", style: "destructive", onPress: logout },
    ]);
  }

  if (!user) return null;

  const menuItems = [
    { label: "Modifica profilo", color: "text-primary", icon: "\u270F\uFE0F" },
    { label: "La mia azienda", color: "text-blue-500", icon: "\uD83C\uDFE2" },
    { label: "Notifiche", color: "text-accent-green", icon: "\uD83D\uDD14" },
    { label: "Privacy e sicurezza", color: "text-gray-500", icon: "\uD83D\uDD12" },
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
              {user.profileCompleted ? "Profilo completo" : "Completa profilo"}
            </Text>
          </View>
        </View>

        <View className="px-4">
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              className="flex-row items-center py-4 border-b border-gray-100"
            >
              <Text className="text-lg mr-3">{item.icon}</Text>
              <Text className={`text-base font-medium ${item.color} flex-1`}>{item.label}</Text>
              <Text className="text-gray-300 text-lg">{"\u203A"}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center py-4"
          >
            <Text className="text-lg mr-3">{"\uD83D\uDEAA"}</Text>
            <Text className="text-base font-medium text-accent-red">Esci</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
