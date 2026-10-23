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
import { Logo } from "@/components/Logo";
import { PasswordField } from "@/components/PasswordField";
import { lastEmail } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { signIn, signInAsGuest, signUp } from "@/services/auth";
import { colors } from "@/theme";

export default function Login() {
  const { t } = useLanguage();
  // Abre en "Crea tu cuenta" (ahí está "Entrar sin cuenta"), salvo que en este celular ya se haya
  // entrado con correo: entonces abre en "Inicia sesión" con ese correo ya escrito.
  const [email, setEmail] = useState(() => lastEmail() ?? "");
  const [isRegister, setIsRegister] = useState(() => !lastEmail());
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // No navegamos después de entrar: al cambiar la sesión, _layout.tsx muestra la pantalla que toca.
  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      const { code, message } = e as AuthError;
      Alert.alert(t.errorTitle, (code && t.authErrors[code]) || message);
    } finally {
      setBusy(false);
    }
  }

  // El correo recordado solo se usa para entrar: al pasar a "Crea tu cuenta" se vacía el campo y al
  // volver a "Inicia sesión" se repone. Si el usuario escribió otro correo, se respeta.
  function toggleMode() {
    const remembered = lastEmail();
    if (!isRegister && email === remembered) setEmail("");
    if (isRegister && !email && remembered) setEmail(remembered);
    setIsRegister(!isRegister);
  }

  function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert(t.missingTitle, t.missingBody);
      return;
    }
    run(() => (isRegister ? signUp : signIn)(email.trim(), password));
  }

  return (
    // "padding" en ambas plataformas: con edge-to-edge, Android ya no encoge la pantalla solo.
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.title}>
        <Logo size={34} />
      </View>
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
      <PasswordField value={password} onChangeText={setPassword} isNew={isRegister} />

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

      <Pressable onPress={toggleMode} accessibilityRole="button">
        <Text style={styles.link}>
          {isRegister ? t.toSignIn : t.toRegister}
        </Text>
      </Pressable>

      {/* Solo al crear cuenta: quien ya tiene una entra con su correo. */}
      {isRegister && (
        <>
          <Text style={styles.or}>{t.or}</Text>
          <Pressable
            style={[styles.guestButton, busy && styles.buttonDisabled]}
            onPress={() => run(signInAsGuest)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityHint={t.guestHint}
          >
            <Text style={styles.guestButtonText}>{t.guestButton}</Text>
          </Pressable>
          <Text style={styles.guestHint}>{t.guestHint}</Text>
        </>
      )}

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
    alignItems: "center",
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
    borderRadius: 12,
  },
  input: {
    padding: 12,
    fontSize: 16,
    color: "#000",
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
  link: {
    color: colors.accent,
    textAlign: "center",
    padding: 8,
  },
  or: {
    textAlign: "center",
    color: colors.muted,
  },
  guestButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  guestButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "bold",
  },
  guestHint: {
    textAlign: "center",
    fontSize: 13,
    color: colors.muted,
  },
});
