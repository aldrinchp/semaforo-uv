import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { colors } from "@/theme";

// Campo de contraseña con botón Mostrar / Ocultar. `isNew`: contraseña nueva (registro),
// para que el teléfono ofrezca generar/guardar una en vez de autocompletar la existente.
export function PasswordField({
  value,
  onChangeText,
  isNew,
}: {
  value: string;
  onChangeText: (value: string) => void;
  isNew?: boolean;
}) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        placeholder={t.password}
        placeholderTextColor="#888"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete={isNew ? "new-password" : "current-password"}
      />
      <Pressable
        onPress={() => setShow(!show)}
        accessibilityRole="button"
        accessibilityLabel={show ? t.hidePassword : t.showPassword}
        hitSlop={8}
      >
        <Text style={styles.toggle}>{show ? t.hide : t.show}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  toggle: {
    color: colors.accent,
    fontWeight: "bold",
    paddingHorizontal: 12,
  },
});
