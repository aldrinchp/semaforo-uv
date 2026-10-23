import { StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useLanguage } from "@/context/LanguageContext";
import { uvLevel, uvScale } from "@/services/uv";
import { colors, ui } from "@/theme";

// El UV en un círculo del color de su nivel (gris con `muted`, p. ej. un semáforo sin conexión) y al
// lado un título, una línea opcional y el nombre del nivel. Lo usan Hoy, Dashboard y Semáforos.
export function UvHeader({
  uv,
  title,
  subtitle,
  muted,
  chevron,
}: {
  uv: number | null;
  title: string;
  subtitle?: string;
  muted?: boolean;
  chevron?: boolean;
}) {
  const { t } = useLanguage();
  const level = uv !== null && !muted ? uvLevel(uv) : null;
  const fg = level ? uvScale[level].text : "#fff";

  return (
    <View style={styles.header}>
      <View style={[styles.circle, { backgroundColor: level ? uvScale[level].background : colors.muted }]}>
        <Text style={[styles.circleLabel, { color: fg }]}>UV</Text>
        <Text style={[styles.circleValue, { color: fg }]}>{uv !== null ? Math.round(uv) : "–"}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={ui.cardTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.muted}>{subtitle}</Text>}
        {level && <Text style={styles.level}>{t.levels[level].name}</Text>}
      </View>
      {chevron && (
        <SymbolView name={{ ios: "chevron.right", android: "chevron_right" }} tintColor={colors.muted} size={18} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  circleLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: -2,
  },
  circleValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  flex: {
    flex: 1,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  level: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
});
