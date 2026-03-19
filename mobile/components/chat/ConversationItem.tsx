import { TouchableOpacity, View, Text } from "react-native";
import { Avatar } from "../ui/Avatar";
import type { Conversation, ConversationType } from "@xpylon/shared";

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
}

export function ConversationItem({ conversation, currentUserId, onPress }: ConversationItemProps) {
  const isGroup = conversation.type === "OPPORTUNITY_GROUP";
  const otherMember = conversation.members?.find((m) => m.userId !== currentUserId)?.user;
  const displayName = isGroup
    ? conversation.name || "Group"
    : otherMember
    ? `${otherMember.firstName} ${otherMember.lastName}`
    : "User";
  const preview = conversation.lastMessage?.content || "No messages";
  const time = conversation.lastMessage
    ? new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center px-4 py-3">
      {isGroup ? (
        <View className="w-12 h-12 rounded-lg bg-accent-green items-center justify-center">
          <Text className="text-white text-lg">{"\uD83D\uDC65"}</Text>
        </View>
      ) : otherMember ? (
        <Avatar firstName={otherMember.firstName} lastName={otherMember.lastName} />
      ) : (
        <Avatar firstName="?" lastName="?" />
      )}
      <View className="flex-1 ml-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {displayName}
          </Text>
          <Text className="text-xs text-gray-400">{time}</Text>
        </View>
        <View className="flex-row justify-between items-center mt-0.5">
          <Text className="text-sm text-gray-500 flex-1 mr-2" numberOfLines={1}>
            {preview}
          </Text>
          {(conversation.unreadCount ?? 0) > 0 && (
            <View className="bg-primary rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center">
              <Text className="text-white text-xs font-bold">{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
