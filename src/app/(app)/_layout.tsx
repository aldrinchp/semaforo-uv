import { Pressable, StyleSheet } from "react-native";
import { Drawer } from "expo-router/drawer";
import { SymbolView } from "expo-symbols";
import { Avatar } from "@/components/Avatar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { colors } from "@/theme";

// Pantallas con sesión iniciada: cabecera (perfil | logo | idioma) y menú lateral con el perfil.
// Dentro van las pestañas de (tabs)/.
export default function AppLayout() {
  const { t } = useLanguage();
  const { profile, photo } = useProfile();
  return (
    <Drawer
      drawerContent={(props) => <ProfileDrawer {...props} />}
      screenOptions={({ navigation }) => ({
        headerTitleAlign: "center",
        headerTitle: () => <Logo />,
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.openDrawer()}
            accessibilityRole="button"
            accessibilityLabel={t.openProfile}
            hitSlop={8}
            style={styles.profileButton}
          >
            {/* Su foto, su avatar o, si no tiene ninguno, el icono de persona. */}
            <Avatar
              photo={photo}
              avatar={profile?.avatar}
              size={36}
              style={photo || profile?.avatar ? styles.headerAvatar : undefined}
              fallback={
                <SymbolView
                  name={{ ios: "person.crop.circle", android: "account_circle" }}
                  tintColor={colors.text}
                  size={32}
                />
              }
            />
          </Pressable>
        ),
        headerRight: () => <LanguageToggle />,
      })}
    >
      <Drawer.Screen name="(tabs)" />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    marginLeft: 12,
  },
  headerAvatar: {
    backgroundColor: "#E1F0F8",
  },
});
