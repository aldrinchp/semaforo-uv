import { Drawer } from "expo-router/drawer";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProfileDrawer } from "@/components/ProfileDrawer";

// Pantallas con sesión iniciada: menú lateral izquierdo (botón ☰ o deslizando desde el borde).
export default function AppLayout() {
  return (
    <Drawer drawerContent={(props) => <ProfileDrawer {...props} />}>
      <Drawer.Screen
        name="index"
        options={{ title: "SunShield", headerRight: () => <LanguageToggle /> }}
      />
    </Drawer>
  );
}
