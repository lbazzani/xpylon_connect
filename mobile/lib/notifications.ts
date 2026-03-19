import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import { api } from "./api";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification channels for Android
async function setupAndroidChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("messages", {
    name: "Messages",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#F15A24",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("connections", {
    name: "Connections",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("calls", {
    name: "Calls",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500],
    lightColor: "#F15A24",
    sound: "default",
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  await setupAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: undefined, // Uses app.json config
  });
  const token = tokenData.data;

  // Register token with backend
  try {
    await api.post("/users/me/fcm-token", { token });
  } catch (err) {
    console.error("Failed to register push token:", err);
  }

  return token;
}

export async function unregisterPushNotifications(
  token: string
): Promise<void> {
  try {
    await api.delete("/users/me/fcm-token", { token });
  } catch (err) {
    console.error("Failed to unregister push token:", err);
  }
}

// Handle notification tap — navigate to the right screen
export function setupNotificationResponseHandler() {
  const subscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, string>
        | undefined;
      if (!data) return;

      switch (data.type) {
        case "message":
          if (data.conversationId) {
            router.push(`/(app)/messages/${data.conversationId}`);
          }
          break;
        case "connection_request":
          router.push("/(app)/network");
          break;
        case "connection_accepted":
          router.push("/(app)/network");
          break;
        case "call":
          if (data.conversationId) {
            router.push(`/(app)/messages/${data.conversationId}`);
          }
          break;
        case "missed_call":
          router.push("/(app)/messages");
          break;
      }
    });

  return subscription;
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
