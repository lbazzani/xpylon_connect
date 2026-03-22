import { Tabs } from "expo-router";
import { Platform, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";
import { useAuthStore } from "../../store/auth";

export default function AppLayout() {
  const isDemo = useAuthStore((s) => s.isDemo);

  return (
    <View style={{ flex: 1 }}>
      {isDemo && (
        <View
          style={{
            backgroundColor: "#FEF3C7",
            paddingVertical: 4,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="flask-outline" size={12} color="#D97706" />
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#D97706", marginLeft: 4 }}>
            DEMO MODE
          </Text>
        </View>
      )}
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
        <Tabs.Screen name="network/[id]" options={{ href: null }} />
        <Tabs.Screen name="network/imports" options={{ href: null }} />
        <Tabs.Screen name="invite/[token]" options={{ href: null }} />
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
        <Tabs.Screen name="opportunities/review" options={{ href: null }} />
        <Tabs.Screen name="profile/edit" options={{ href: null }} />
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
    </View>
  );
}
