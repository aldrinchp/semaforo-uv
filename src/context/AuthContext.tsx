import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthState = { session: Session | null; loading: boolean };

const AuthContext = createContext<AuthState>({ session: null, loading: true });

// Último correo con el que se entró en este celular (null si nunca se entró con correo). El login lo
// usa para abrir en "Inicia sesión" con el correo ya escrito. Se guarda junto a la sesión.
const LAST_EMAIL_KEY = "lastEmail";
export const lastEmail = () => localStorage.getItem(LAST_EMAIL_KEY);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    // Se dispara al iniciar con la sesión guardada (INITIAL_SESSION) y luego en cada login/logout.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Entrar, registrarse o guardar la cuenta de invitado con correo: se recuerda ese correo.
      if (session?.user.email && !session.user.is_anonymous) localStorage.setItem(LAST_EMAIL_KEY, session.user.email);
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
