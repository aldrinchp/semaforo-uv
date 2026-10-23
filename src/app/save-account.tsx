import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { router, Stack } from "expo-router";
import type { AuthError } from "@supabase/supabase-js";
import { KeyboardScroll } from "@/components/KeyboardScroll";
import { PasswordField } from "@/components/PasswordField";
import { useLanguage } from "@/context/LanguageContext";
import { saveGuestAccount } from "@/services/auth";
import { colors, ui } from "@/theme";

// "Guardar mi cuenta con correo": el invitado añade correo y contraseña y conserva su perfil.
export default function SaveAccount() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!email.trim() || !password) {
      Alert.alert(t.missingTitle, t.missingBody);
      return;
    }
    setBusy(true);
    try {
      const confirmed = await saveGuestAccount(email.trim(), password);
      if (confirmed) Alert.alert(t.accountSavedTitle, t.accountSavedBody);
      else Alert.alert(t.confirmEmailTitle, t.confirmEmailBody);
      router.back();
    } catch (e) {
      const { code, message } = e as AuthError;
      Alert.alert(t.errorTitle, (code && t.authErrors[code]) || message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t.saveAccount }} />
      <KeyboardScroll contentContainerStyle={styles.content}>
        <Text style={ui.body}>{t.saveAccountIntro}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.email}
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <PasswordField value={password} onChangeText={setPassword} isNew />
        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={busy}
          accessibilityRole="button"
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t.saveAccountButton}</Text>}
        </Pressable>
      </KeyboardScroll>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#000",
    backgroundColor: colors.card,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
