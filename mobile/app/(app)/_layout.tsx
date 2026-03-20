import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gray900,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 56 : 84,
          paddingBottom: Platform.OS === "web" ? 6 : 28,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="messages/index"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="messages/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="network/index"
        options={{
          title: "Network",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="opportunities/index"
        options={{
          title: "Opportunities",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bulb" : "bulb-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="opportunities/[id]" options={{ href: null }} />
      <Tabs.Screen name="opportunities/new" options={{ href: null }} />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={21} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
