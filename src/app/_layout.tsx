import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";

// Mantiene la pantalla de carga hasta saber si hay una sesión guardada.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AuthGatedStack />
      </AuthProvider>
    </LanguageProvider>
  );
}

function AuthGatedStack() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hide();
  }, [loading]);

  // Con sesión solo existe el grupo "(app)" (con menú lateral); sin sesión solo "login".
  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
