import { supabase } from "@/lib/supabase";

// Lanzan el AuthError de Supabase tal cual; la pantalla traduce su `code` al idioma activo.
export async function signUp(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Entrar sin cuenta: Supabase crea un usuario anónimo (sin correo) cuya sesión queda en este celular.
export async function signInAsGuest() {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

// Convierte la cuenta de invitado en una con correo y contraseña. Es el mismo usuario, así que
// conserva su perfil. Devuelve true si el correo quedó confirmado al instante (con "Confirm email"
// desactivado en Supabase); false si Supabase envió un correo de confirmación.
// ponytail: si se activa "Confirm email", habrá que añadir el paso del código de 6 dígitos.
export async function saveGuestAccount(email: string, password: string) {
  const { data, error } = await supabase.auth.updateUser({ email, password });
  if (error) throw error;
  return data.user.email === email;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
