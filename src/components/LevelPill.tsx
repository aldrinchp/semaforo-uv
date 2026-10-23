import { StyleSheet, Text, View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { uvLevel, uvScale } from "@/services/uv";

// Nombre del nivel sobre su color OMS (texto negro o blanco según el fondo, para que se lea).
export function LevelPill({ uv }: { uv: number }) {
  const { t } = useLanguage();
  const level = uvLevel(uv);
  return (
    <View style={[styles.pill, { backgroundColor: uvScale[level].background }]}>
      <Text style={[styles.text, { color: uvScale[level].text }]}>{t.levels[level].name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontWeight: "bold",
  },
});
