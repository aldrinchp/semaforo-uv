import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { DrawerContentScrollView, type DrawerContentComponentProps } from "expo-router/drawer";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { signOut } from "@/services/auth";

// Contenido del menú lateral: datos del usuario y cerrar sesión.
export function ProfileDrawer(props: DrawerContentComponentProps) {
  const { session } = useAuth();
  const { t } = useLanguage();
  const email = session?.user.email ?? "";

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{email.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.title}>{t.profile}</Text>
      <Text style={styles.label}>{t.signedInAs}</Text>
      <Text style={styles.email}>{email}</Text>
      <Button
        title={t.signOut}
        color="#f57c00"
        onPress={() => signOut().catch((e) => Alert.alert(t.errorTitle, e.message))}
      />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f57c00",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  label: {
    color: "#555",
  },
  email: {
    fontSize: 16,
    marginBottom: 16,
  },
});
