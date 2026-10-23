import { StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import { KeyboardScroll } from "@/components/KeyboardScroll";
import { ProfileForm } from "@/components/ProfileForm";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import type { Profile } from "@/services/profile";

// Editar el perfil (se abre desde el menú lateral). Mismo formulario, con las respuestas guardadas.
export default function EditProfile() {
  const { t } = useLanguage();
  const { profile, save } = useProfile();

  async function handleSave(p: Profile, newPhotoUri?: string) {
    await save(p, newPhotoUri);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: t.editProfile }} />
      <KeyboardScroll contentContainerStyle={styles.content}>
        <ProfileForm initial={profile ?? undefined} submitLabel={t.saveChanges} onSubmit={handleSave} />
      </KeyboardScroll>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
});
