import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import type { Lang } from "@/i18n/strings";
import { colors, ui } from "@/theme";

// Cada idioma con su nombre en ese mismo idioma (así lo reconoce quien lo habla).
const NAMES: Record<Lang, string> = { es: "Español", en: "English", qu: "Kichwa" };

// Muestra el idioma actual ("🌐 ES ▾"); al tocarlo se abre un menú con los tres idiomas.
export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t.language}: ${NAMES[lang]}`}
        hitSlop={8}
      >
        <Text style={styles.text}>🌐 {lang.toUpperCase()} ▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Tocar fuera del menú lo cierra. */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[ui.card, styles.menu]} onStartShouldSetResponder={() => true}>
            <Text style={ui.cardTitle}>{t.language}</Text>
            {(Object.keys(NAMES) as Lang[]).map((l) => (
              <Pressable
                key={l}
                onPress={() => {
                  setLang(l);
                  setOpen(false);
                }}
                style={[styles.option, l === lang && styles.optionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: l === lang }}
              >
                <Text style={[styles.optionText, l === lang && styles.optionTextSelected]}>{NAMES[l]}</Text>
                {l === lang && <Text style={styles.optionTextSelected}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.accent,
    fontWeight: "bold",
    textAlign: "center",
    padding: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  menu: {
    width: "100%",
    maxWidth: 300,
    gap: 4,
  },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionSelected: {
    backgroundColor: colors.accentSoft,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: "bold",
  },
});
