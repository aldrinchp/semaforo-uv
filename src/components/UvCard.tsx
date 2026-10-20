import { StyleSheet, Text, View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { uvColors, uvLevel } from "@/services/uv";

// Tarjeta del semáforo (color + número + nivel) y las recomendaciones de ese nivel.
export function UvCard({ uv }: { uv: number }) {
  const { t } = useLanguage();
  const level = uvLevel(uv);
  const { background, text } = uvColors[level];
  const { name, tips } = t.levels[level];
  const index = Math.round(uv);

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.card, { backgroundColor: background }]}
        accessible
        accessibilityLabel={`${t.uvIndex} ${index}, ${name}`}
      >
        <Text style={[styles.label, { color: text }]}>{t.uvIndex}</Text>
        <Text style={[styles.value, { color: text }]}>{index}</Text>
        <Text style={[styles.level, { color: text }]}>{name}</Text>
      </View>

      <Text style={styles.title}>{t.recommendations}</Text>
      {tips.map((tip) => (
        <Text key={tip} style={styles.tip}>
          • {tip}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
  },
  value: {
    fontSize: 72,
    fontWeight: "bold",
  },
  level: {
    fontSize: 28,
    fontWeight: "bold",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  tip: {
    fontSize: 16,
    lineHeight: 22,
  },
});
