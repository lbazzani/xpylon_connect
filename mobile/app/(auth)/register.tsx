import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !companyName.trim()) return;
    setLoading(true);
    try {
      const { user } = await api.post("/auth/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        companyName: companyName.trim(),
      });
      setUser(user);
      router.replace("/(auth)/profile-setup");
    } catch {
      // handle error
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
        <ScrollView className="flex-1 px-6" contentContainerClassName="justify-center py-12">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Crea il tuo account</Text>
          <Text className="text-base text-gray-500 mb-8">
            Inserisci i tuoi dati per iniziare
          </Text>
          <Input label="Nome" placeholder="Mario" value={firstName} onChangeText={setFirstName} />
          <Input label="Cognome" placeholder="Rossi" value={lastName} onChangeText={setLastName} />
          <Input
            label="Azienda"
            placeholder="Nome della tua azienda"
            value={companyName}
            onChangeText={setCompanyName}
          />
          <Button
            title="Continua"
            onPress={handleSubmit}
            loading={loading}
            disabled={!firstName.trim() || !lastName.trim() || !companyName.trim()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
