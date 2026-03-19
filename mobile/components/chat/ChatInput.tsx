import { View, TextInput, TouchableOpacity, Text, Image } from "react-native";
import { useState, useRef, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";
import type { Message } from "@xpylon/shared";

interface ChatInputProps {
  onSend: (content: string, replyToId?: string) => void;
  onSendAttachments?: (uris: string[], caption?: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export function ChatInput({ onSend, onSendAttachments, onTyping, onStopTyping, replyingTo, onCancelReply }: ChatInputProps) {
  const [text, setText] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  function handleTextChange(value: string) {
    setText(value);
    if (value.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      onTyping?.();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onStopTyping?.();
    }, 2000);
  }

  function handleSend() {
    if (selectedImages.length > 0 && onSendAttachments) {
      onSendAttachments(selectedImages, text.trim() || undefined);
      setSelectedImages([]);
      setText("");
      onCancelReply?.();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed, replyingTo?.id);
    setText("");
    onCancelReply?.();
    isTypingRef.current = false;
    onStopTyping?.();
  }

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setSelectedImages((prev) => [...prev, result.assets[0].uri]);
    }
  }

  function removeImage(uri: string) {
    setSelectedImages((prev) => prev.filter((u) => u !== uri));
  }

  const canSend = text.trim() || selectedImages.length > 0;

  return (
    <View className="bg-white border-t border-gray-100">
      {/* Reply preview bar */}
      {replyingTo && (
        <View className="flex-row items-center px-4 py-2 bg-gray-50 border-b border-gray-100">
          <View className="flex-1 border-l-4 border-primary pl-3">
            <Text className="text-xs font-bold text-primary">{replyingTo.sender?.firstName || ""}</Text>
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
              {replyingTo.content || "Attachment"}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} className="ml-3 p-1">
            <Ionicons name="close" size={18} color={colors.gray400} />
          </TouchableOpacity>
        </View>
      )}

      {/* Image previews */}
      {selectedImages.length > 0 && (
        <View className="flex-row px-4 pt-2 gap-2 flex-wrap">
          {selectedImages.map((uri) => (
            <View key={uri} className="relative mb-1">
              <Image source={{ uri }} className="w-16 h-16 rounded-xl" />
              <TouchableOpacity
                onPress={() => removeImage(uri)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={12} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input bar */}
      <View className="flex-row items-end px-2 py-2">
        {/* Attachment buttons */}
        <TouchableOpacity onPress={handlePickImage} className="w-10 h-10 items-center justify-center">
          <Ionicons name="attach-outline" size={22} color={colors.gray500} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCamera} className="w-10 h-10 items-center justify-center">
          <Ionicons name="camera-outline" size={22} color={colors.gray500} />
        </TouchableOpacity>

        {/* Text input */}
        <View className="flex-1 bg-gray-50 rounded-3xl border border-gray-200 mx-1">
          <TextInput
            ref={inputRef}
            className="px-4 py-2.5 text-[15px] text-gray-900 max-h-28"
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={handleTextChange}
            multiline
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          className={`w-11 h-11 rounded-full items-center justify-center ${canSend ? "bg-primary" : "bg-gray-200"}`}
          disabled={!canSend}
        >
          <Ionicons name="send" size={18} color={canSend ? colors.white : colors.gray400} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
