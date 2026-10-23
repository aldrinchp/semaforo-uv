import { StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useLanguage } from "@/context/LanguageContext";
import type { UvError } from "@/context/UvContext";
import { colors } from "@/theme";

// Aviso cuando no se pudo actualizar y se muestran los datos guardados: de cuándo son y por qué.
export function SavedDataBanner({ fetchedAt, error }: { fetchedAt: number; error: UvError }) {
  const { t, lang } = useLanguage();
  const when = new Date(fetchedAt).toLocaleString(lang, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <View style={styles.banner} accessible accessibilityRole="alert">
      <SymbolView name={{ ios: "wifi.slash", android: "wifi_off" }} tintColor={colors.text} size={24} />
      <View style={styles.texts}>
        <Text style={styles.title}>{t.savedData(when)}</Text>
        <Text style={styles.reason}>{t.uvErrors[error]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF4D6",
    borderColor: "#F0D48A",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: "bold",
    color: colors.text,
  },
  reason: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
});
