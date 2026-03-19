import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#534AB7",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          borderTopColor: "#F3F4F6",
          backgroundColor: "#FFFFFF",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="messaggi"
        options={{
          title: "Messaggi",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>{"\uD83D\uDCAC"}</Text>,
        }}
      />
      <Tabs.Screen
        name="rete"
        options={{
          title: "Rete",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>{"\uD83D\uDC65"}</Text>,
        }}
      />
      <Tabs.Screen
        name="profilo"
        options={{
          title: "Profilo",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>{"\uD83D\uDC64"}</Text>,
        }}
      />
    </Tabs>
  );
}
