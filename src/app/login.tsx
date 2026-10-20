import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { AuthError } from "@supabase/supabase-js";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";
import { signIn, signUp } from "@/services/auth";

export default function Login() {
  const { t } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert(t.missingTitle, t.missingBody);
      return;
    }
    setBusy(true);
    try {
      await (isRegister ? signUp : signIn)(email.trim(), password);
      // No navegamos aquí: al cambiar la sesión, _layout.tsx muestra la pantalla principal.
    } catch (e) {
      const { code, message } = e as AuthError;
      Alert.alert(t.errorTitle, (code && t.authErrors[code]) || message);
    } finally {
      setBusy(false);
    }
  }

  return (
    // "padding" en ambas plataformas: con edge-to-edge, Android ya no encoge la pantalla solo.
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <Text style={styles.title}>SunShield</Text>
      <Text style={styles.subtitle}>{isRegister ? t.registerSubtitle : t.signInSubtitle}</Text>

      <TextInput
        style={[styles.field, styles.input]}
        placeholder={t.email}
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <View style={[styles.field, styles.passwordRow]}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder={t.password}
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete={isRegister ? "new-password" : "current-password"}
        />
        <Pressable
          onPress={() => setShowPassword(!showPassword)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? t.hidePassword : t.showPassword}
          hitSlop={8}
        >
          <Text style={styles.toggle}>{showPassword ? t.hide : t.show}</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={busy}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isRegister ? t.registerButton : t.signInButton}</Text>
        )}
      </Pressable>

      <Pressable onPress={() => setIsRegister(!isRegister)} accessibilityRole="button">
        <Text style={styles.link}>
          {isRegister ? t.toSignIn : t.toRegister}
        </Text>
      </Pressable>

      <LanguageToggle />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 12,
    color: "#555",
  },
  field: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  input: {
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
  },
  toggle: {
    color: "#f57c00",
    fontWeight: "bold",
    paddingHorizontal: 12,
  },
  button: {
    backgroundColor: "#f57c00",
    borderRadius: 8,
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
  link: {
    color: "#f57c00",
    textAlign: "center",
    padding: 8,
  },
});
