import { Pressable, StyleSheet, Text } from "react-native";
import { useLanguage } from "@/context/LanguageContext";

// Muestra el idioma al que se cambiará ("English" estando en español y viceversa).
export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  return (
    <Pressable
      onPress={() => setLang(lang === "es" ? "en" : "es")}
      accessibilityRole="button"
      accessibilityLabel={t.changeLanguage}
      hitSlop={8}
    >
      <Text style={styles.text}>{t.otherLanguage}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    color: "#f57c00",
    fontWeight: "bold",
    textAlign: "center",
    padding: 8,
  },
});
