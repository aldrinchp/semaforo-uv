import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProfileProvider, useProfile } from "@/context/ProfileContext";

// Mantiene la pantalla de carga hasta saber si hay una sesión guardada (y si tiene perfil).
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ProfileProvider>
          <AuthGatedStack />
        </ProfileProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

function AuthGatedStack() {
  const { session, loading } = useAuth();
  const profile = useProfile();

  useEffect(() => {
    if (!loading && !profile.loading) SplashScreen.hide();
  }, [loading, profile.loading]);

  // Se pide el formulario solo si sabemos con certeza que no tiene perfil (si la consulta
  // falló, p. ej. sin internet, se le deja entrar y se vuelve a consultar la próxima vez).
  const needsProfile = !!session && !profile.loading && !profile.failed && !profile.profile;
  // Mientras se consulta el perfil se muestra "profile-setup" (con un indicador de carga), para no
  // abrir la app (y pedir el GPS) un instante antes de saber si falta el perfil.
  const inSetup = !!session && (profile.loading || needsProfile);

  // Sin sesión: "login". Con sesión y sin perfil: "profile-setup". Con perfil: "(app)", "edit-profile" y "save-account".
  return (
    <Stack>
      <Stack.Protected guard={!!session && !inSetup}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="save-account" />
        <Stack.Screen name="semaforo/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={inSetup}>
        <Stack.Screen name="profile-setup" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
