import { View } from "react-native";
import { colors } from "../../lib/theme";

interface TourProgressSimpleProps {
  total: number;
  active: number;
}

export function TourProgressSimple({ total, active }: TourProgressSimpleProps) {
  return (
    <View className="flex-row items-center justify-center py-6">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 24 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.gray900,
            opacity: i === active ? 1 : 0.25,
            marginHorizontal: 3,
          }}
        />
      ))}
    </View>
  );
}
