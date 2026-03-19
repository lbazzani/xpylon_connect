import { View, Text, KeyboardAvoidingView, Platform, Image, Dimensions, TouchableOpacity, FlatList, Modal, TextInput } from "react-native";
import { useState, useMemo } from "react";
import { getLocales } from "expo-localization";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Top countries first, then alphabetical
const COUNTRIES = [
  { code: "IT", dial: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "US", dial: "+1", name: "United States", flag: "🇺🇸" },
  { code: "GB", dial: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", dial: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "FR", dial: "+33", name: "France", flag: "🇫🇷" },
  { code: "ES", dial: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "CH", dial: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "AT", dial: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "NL", dial: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", dial: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "PT", dial: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "SE", dial: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", dial: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "DK", dial: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", dial: "+358", name: "Finland", flag: "🇫🇮" },
  { code: "PL", dial: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "CZ", dial: "+420", name: "Czech Republic", flag: "🇨🇿" },
  { code: "RO", dial: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "GR", dial: "+30", name: "Greece", flag: "🇬🇷" },
  { code: "HR", dial: "+385", name: "Croatia", flag: "🇭🇷" },
  { code: "SI", dial: "+386", name: "Slovenia", flag: "🇸🇮" },
  { code: "IE", dial: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "AU", dial: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "CA", dial: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "BR", dial: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", dial: "+52", name: "Mexico", flag: "🇲🇽" },
  { code: "JP", dial: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "KR", dial: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", dial: "+86", name: "China", flag: "🇨🇳" },
  { code: "IN", dial: "+91", name: "India", flag: "🇮🇳" },
  { code: "AE", dial: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "SA", dial: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "TR", dial: "+90", name: "Turkey", flag: "🇹🇷" },
  { code: "IL", dial: "+972", name: "Israel", flag: "🇮🇱" },
  { code: "ZA", dial: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "SG", dial: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "HK", dial: "+852", name: "Hong Kong", flag: "🇭🇰" },
  { code: "AR", dial: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", dial: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "CO", dial: "+57", name: "Colombia", flag: "🇨🇴" },
];

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(() => {
    try {
      const locales = getLocales();
      const regionCode = locales[0]?.regionCode?.toUpperCase();
      if (regionCode) {
        const match = COUNTRIES.find((c) => c.code === regionCode);
        if (match) return match;
      }
    } catch {}
    return COUNTRIES[0]; // Fallback: Italy
  });
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const q = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  async function handleSubmit() {
    const digits = phone.replace(/[^\d]/g, "");
    if (!digits) {
      setError("Enter your phone number");
      return;
    }
    if (digits.length < 6) {
      setError("Phone number is too short");
      return;
    }
    const fullNumber = `${country.dial}${digits}`;
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/request-otp", { phone: fullNumber });
      router.push({ pathname: "/(auth)/otp", params: { phone: fullNumber } });
    } catch {
      setError("Error sending code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 px-8 justify-between">
          {/* Top: Logo */}
          <View className="items-center" style={{ marginTop: SCREEN_HEIGHT * 0.08 }}>
            <Image
              source={require("../../assets/images/XpylonLogo_V2.png")}
              style={{ width: 140, height: 44 }}
              resizeMode="contain"
            />
            <Text className="text-sm text-gray-400 mt-3 tracking-widest uppercase font-medium">
              Business Networking
            </Text>
          </View>

          {/* Center: Form */}
          <View className="flex-1 justify-center" style={{ maxWidth: 400, alignSelf: "center", width: "100%" }}>
            <Text className="text-2xl font-bold text-gray-900 mb-1">Sign in</Text>
            <Text className="text-sm text-gray-500 mb-8 leading-5">
              Enter your phone number and we'll send you a verification code.
            </Text>

            {/* Phone input with country picker */}
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Phone number</Text>
            <View className={`flex-row rounded-xl border ${error ? "border-2 border-accent-red" : "border-gray-200"} bg-gray-50 mb-1`}>
              {/* Country selector */}
              <TouchableOpacity
                onPress={() => setShowPicker(true)}
                className="flex-row items-center px-3 border-r border-gray-200"
                activeOpacity={0.6}
              >
                <Text className="text-xl mr-1">{country.flag}</Text>
                <Text className="text-sm font-semibold text-gray-700">{country.dial}</Text>
                <Text className="text-xs text-gray-400 ml-1">▼</Text>
              </TouchableOpacity>

              {/* Phone input */}
              <TextInput
                className="flex-1 px-3 py-3.5 text-[15px] text-gray-900"
                placeholder="348 123 4567"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (error) setError("");
                }}
                autoFocus
              />
            </View>
            {error ? (
              <Text className="text-xs text-accent-red mt-1.5 mb-3">{error}</Text>
            ) : (
              <View className="mb-4" />
            )}

            <Button
              title="Continue"
              onPress={handleSubmit}
              loading={loading}
              disabled={!phone.trim()}
            />
          </View>

          {/* Footer */}
          <View className="items-center pb-6">
            <Text className="text-xs text-gray-400 text-center leading-4 mb-4" style={{ maxWidth: 280 }}>
              By continuing, you agree to our{" "}
              <Text className="text-gray-500 font-medium">Terms of Service</Text>
              {" "}and{" "}
              <Text className="text-gray-500 font-medium">Privacy Policy</Text>
            </Text>
            <View className="w-10 h-0.5 rounded-full bg-gray-200" />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Country picker modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900">Select country</Text>
            <TouchableOpacity onPress={() => { setShowPicker(false); setSearchQuery(""); }}>
              <Text className="text-base font-medium" style={{ color: colors.primary }}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="px-5 py-3">
            <TextInput
              className="bg-gray-50 rounded-xl px-4 py-3 text-[15px] text-gray-900 border border-gray-200"
              placeholder="Search country or code..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code + item.dial}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setCountry(item);
                  setShowPicker(false);
                  setSearchQuery("");
                }}
                className={`flex-row items-center px-5 py-3.5 border-b border-gray-50 ${
                  item.code === country.code ? "bg-gray-50" : ""
                }`}
                activeOpacity={0.6}
              >
                <Text className="text-xl mr-3">{item.flag}</Text>
                <Text className="flex-1 text-base text-gray-900">{item.name}</Text>
                <Text className="text-sm text-gray-500 font-medium">{item.dial}</Text>
                {item.code === country.code && (
                  <Text className="ml-2" style={{ color: colors.primary }}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-gray-400">No countries found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
