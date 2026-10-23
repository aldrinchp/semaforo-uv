import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { signOut } from "@/services/auth";
import { colors } from "@/theme";

// Menú lateral: cabecera azul con saludo, aviso para invitados, opciones con icono y cerrar sesión abajo.
export function ProfileDrawer(props: DrawerContentComponentProps) {
  const { session } = useAuth();
  const { profile, photo } = useProfile();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const email = session?.user.email ?? "";
  const isGuest = !!session?.user.is_anonymous; // entró sin cuenta

  function open(path: "/edit-profile" | "/save-account") {
    props.navigation.closeDrawer();
    router.push(path);
  }

  // Un invitado que cierra sesión no puede volver a entrar a esa cuenta: se le avisa antes.
  function handleSignOut() {
    const doSignOut = () => signOut().catch((e) => Alert.alert(t.errorTitle, e.message));
    if (!isGuest) return doSignOut();
    Alert.alert(t.guestSignOutTitle, t.guestSignOutBody, [
      { text: t.cancel, style: "cancel" },
      { text: t.signOut, style: "destructive", onPress: doSignOut },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Avatar
          photo={photo}
          avatar={profile?.avatar}
          size={72}
          style={styles.avatar}
          fallback={<Text style={styles.avatarText}>{(profile?.first_name || email || "?").charAt(0).toUpperCase()}</Text>}
        />
        <Text style={styles.greeting}>{profile ? t.hello(profile.first_name) : t.profile}</Text>
        <Text style={styles.account}>{isGuest ? t.guestShort : email}</Text>
      </View>

      <View style={styles.body}>
        {isGuest && (
          <View style={styles.callout}>
            <Text style={styles.calloutText}>{t.guestCallout}</Text>
            <Pressable
              onPress={() => open("/save-account")}
              accessibilityRole="button"
              style={({ pressed }) => [styles.calloutButton, pressed && styles.pressed]}
            >
              <SymbolView name={{ ios: "envelope", android: "mail" }} tintColor="#fff" size={20} />
              <Text style={styles.calloutButtonText}>{t.saveAccount}</Text>
            </Pressable>
          </View>
        )}
        <MenuItem icon={{ ios: "pencil", android: "edit" }} label={t.editProfile} onPress={() => open("/edit-profile")} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <MenuItem
          icon={{ ios: "rectangle.portrait.and.arrow.right", android: "logout" }}
          label={t.signOut}
          onPress={handleSignOut}
          danger
        />
        <View style={styles.logo}>
          <Logo size={14} />
        </View>
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.danger : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <SymbolView name={icon} tintColor={color} size={22} />
      <Text style={[styles.itemText, danger && { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  header: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomRightRadius: 24,
    gap: 4,
  },
  avatar: {
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: "bold",
  },
  greeting: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  account: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  body: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  callout: {
    backgroundColor: "#E1F0F8",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 4,
  },
  calloutText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  calloutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  calloutButtonText: {
    color: "#fff",
    fontWeight: "bold",
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 24,
  },
  itemPressed: {
    backgroundColor: colors.background,
  },
  itemText: {
    fontSize: 16,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 12,
  },
  logo: {
    alignItems: "center",
  },
});
