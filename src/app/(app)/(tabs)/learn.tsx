import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { uvScale, type UvLevel } from "@/services/uv";
import { colors, ui } from "@/theme";

// Módulo educativo: contenido fijo (qué es el UV, la escala de la OMS y datos curiosos).
export default function Learn() {
  const { t } = useLanguage();
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <View style={ui.card}>
        <Text style={ui.cardTitle}>{t.learnWhatTitle}</Text>
        <Text style={ui.body}>{t.learnWhatBody}</Text>
      </View>

      <View style={ui.card}>
        <Text style={ui.cardTitle}>{t.learnScaleTitle}</Text>
        {(Object.keys(uvScale) as UvLevel[]).map((level) => (
          <View key={level} style={styles.scaleRow}>
            <View style={[styles.swatch, { backgroundColor: uvScale[level].background }]} />
            <Text style={styles.range}>{uvScale[level].range}</Text>
            <Text style={ui.body}>{t.levels[level].name}</Text>
          </View>
        ))}
      </View>

      <View style={ui.card}>
        <Text style={ui.cardTitle}>{t.learnFactsTitle}</Text>
        {t.learnFacts.map((fact) => (
          <Text key={fact} style={ui.body}>
            • {fact}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scaleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  range: {
    width: 48,
    fontWeight: "bold",
    color: colors.text,
  },
});
