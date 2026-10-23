import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { KeyboardScroll } from "@/components/KeyboardScroll";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProfileForm } from "@/components/ProfileForm";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { signOut } from "@/services/auth";
import { colors } from "@/theme";

// "Completa tu perfil": aparece con sesión iniciada pero sin perfil. Al guardar, _layout.tsx
// pasa solo a la app (no hace falta navegar desde aquí).
export default function ProfileSetup() {
  const { t } = useLanguage();
  const { loading, save } = useProfile();

  return (
    <>
      <Stack.Screen options={{ title: t.profileSetupTitle, headerRight: () => <LanguageToggle /> }} />
      {loading ? (
        // Mientras se consulta si ya tiene perfil (justo después de iniciar sesión).
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <KeyboardScroll contentContainerStyle={styles.content}>
          <Text style={styles.intro}>{t.profileSetupIntro}</Text>
          <ProfileForm submitLabel={t.saveProfile} onSubmit={save} />
          <Pressable
            onPress={() => signOut().catch((e) => Alert.alert(t.errorTitle, e.message))}
            accessibilityRole="button"
          >
            <Text style={styles.link}>{t.signOut}</Text>
          </Pressable>
        </KeyboardScroll>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 24,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  link: {
    color: colors.accent,
    textAlign: "center",
    padding: 12,
  },
});
