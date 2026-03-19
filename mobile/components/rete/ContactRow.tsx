import { TouchableOpacity, View, Text } from "react-native";
import { Avatar } from "../ui/Avatar";
import type { User } from "@xpylon/shared";

interface ContactRowProps {
  user: User;
  onPress: () => void;
}

export function ContactRow({ user, onPress }: ContactRowProps) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center px-4 py-3">
      <Avatar firstName={user.firstName} lastName={user.lastName} />
      <View className="flex-1 ml-3">
        <Text className="text-base font-semibold text-gray-900">
          {user.firstName} {user.lastName}
        </Text>
        {user.company && (
          <Text className="text-sm text-gray-500">{user.company.name}</Text>
        )}
      </View>
      <Text className="text-gray-300 text-lg">{"\u203A"}</Text>
    </TouchableOpacity>
  );
}
