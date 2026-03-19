import { View, Text } from "react-native";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import type { User } from "@xpylon/shared";

interface PendingRequestCardProps {
  user: User;
  connectionId: string;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export function PendingRequestCard({ user, connectionId, onAccept, onDecline }: PendingRequestCardProps) {
  return (
    <View className="mx-4 mb-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
      <View className="flex-row items-center mb-3">
        <Avatar firstName={user.firstName} lastName={user.lastName} />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-gray-900">
            {user.firstName} {user.lastName}
          </Text>
          {user.company && (
            <Text className="text-sm text-gray-500">{user.company.name}</Text>
          )}
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button title="Decline" variant="secondary" onPress={() => onDecline(connectionId)} />
        </View>
        <View className="flex-1">
          <Button title="Accept" onPress={() => onAccept(connectionId)} />
        </View>
      </View>
    </View>
  );
}
