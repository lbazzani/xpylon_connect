import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";
import { useState, useCallback, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { colors } from "../../lib/theme";

interface CompanyResult {
  id: string;
  name: string;
  memberCount: number;
}

interface CompanyPickerProps {
  value: string;
  selectedId?: string;
  onSelect: (company: { id: string; name: string } | null) => void;
  label?: string;
  placeholder?: string;
}

export function CompanyPicker({
  value,
  selectedId,
  onSelect,
  label = "Company *",
  placeholder = "Search or enter company name",
}: CompanyPickerProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSelected, setIsSelected] = useState(!!selectedId);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setQuery(value);
    setIsSelected(!!selectedId);
  }, [value, selectedId]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const data = await api.get(`/users/companies/search?q=${encodeURIComponent(q.trim())}`);
      setResults(data.companies || []);
    } catch {
      setResults([]);
    }
  }, []);

  function handleChangeText(text: string) {
    setQuery(text);
    setIsSelected(false);
    onSelect(null);
    setShowResults(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 300);
  }

  function handleSelectCompany(company: CompanyResult) {
    setQuery(company.name);
    setIsSelected(true);
    setShowResults(false);
    setResults([]);
    onSelect({ id: company.id, name: company.name });
  }

  function handleUseCustomName() {
    if (!query.trim()) return;
    setIsSelected(true);
    setShowResults(false);
    setResults([]);
    onSelect({ id: "", name: query.trim() });
  }

  function handleClear() {
    setQuery("");
    setIsSelected(false);
    setShowResults(false);
    setResults([]);
    onSelect(null);
  }

  return (
    <View className="mb-4">
      {label && (
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
          {label}
        </Text>
      )}
      <View className="relative">
        <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
          <TextInput
            className="flex-1 px-4 py-3.5 text-[15px] text-gray-900"
            value={query}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            onFocus={() => {
              if (query.trim().length >= 2 && !isSelected) setShowResults(true);
            }}
            onBlur={() => {
              // Delay to allow tap on results
              setTimeout(() => setShowResults(false), 200);
            }}
          />
          {isSelected && (
            <View className="flex-row items-center mr-2">
              <Ionicons name="checkmark-circle" size={18} color={colors.green} />
              <TouchableOpacity onPress={handleClear} className="ml-1 p-1">
                <Ionicons name="close-circle" size={16} color={colors.gray400} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dropdown results */}
        {showResults && query.trim().length >= 2 && (
          <View
            className="absolute left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
            style={{ top: 52, zIndex: 100, maxHeight: 220 }}
          >
            {results.length > 0 && (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectCompany(item)}
                    className="flex-row items-center px-4 py-3 border-b border-gray-50"
                    activeOpacity={0.6}
                  >
                    <Ionicons name="business" size={16} color={colors.gray500} />
                    <View className="flex-1 ml-2.5">
                      <Text className="text-sm font-medium text-gray-900">{item.name}</Text>
                      <Text className="text-xs text-gray-400">
                        {item.memberCount} {item.memberCount === 1 ? "member" : "members"} on Xpylon
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.gray300} />
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Create new option */}
            {!results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase()) && (
              <TouchableOpacity
                onPress={handleUseCustomName}
                className="flex-row items-center px-4 py-3 bg-gray-50"
                activeOpacity={0.6}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text className="text-sm ml-2.5" style={{ color: colors.primary }}>
                  Add "<Text className="font-semibold">{query.trim()}</Text>" as new company
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
