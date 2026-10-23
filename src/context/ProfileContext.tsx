import "expo-sqlite/localStorage/install";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { useAuth } from "@/context/AuthContext";
import { deletePhoto, photoUrl } from "@/services/photo";
import { fetchProfile, saveProfile, type Profile } from "@/services/profile";

// Foto lista para mostrar: `uri` (enlace temporal o archivo local) y `key` (su ruta, para la caché).
export type ProfilePhoto = { uri: string; key: string };

type ProfileState = {
  profile: Profile | null;
  photo: ProfilePhoto | null;
  loading: boolean;
  // No se pudo consultar (p. ej. sin internet): no sabemos si tiene perfil, así que no se le pide.
  failed: boolean;
  save: (profile: Profile, newPhotoUri?: string) => Promise<void>;
};

const ProfileContext = createContext<ProfileState>({
  profile: null,
  photo: null,
  loading: true,
  failed: false,
  save: async () => {},
});

type Cached = { userId: string; profile: Profile | null; failed: boolean };

// El último perfil cargado se guarda en el celular: así el saludo, el avatar y las respuestas
// están disponibles al instante y sin internet. Se borra al cerrar sesión.
const CACHE_KEY = "profileCache";

function readCache(): Cached | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    return cached?.userId && cached.profile ? { userId: cached.userId, profile: cached.profile, failed: false } : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, profile: Profile | null) {
  if (profile) localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, profile }));
  else localStorage.removeItem(CACHE_KEY);
}

// Perfil del usuario con sesión. Se muestra el guardado (si es de este usuario) y se vuelve a
// consultar cada vez que cambia el usuario (login / logout).
export function ProfileProvider({ children }: PropsWithChildren) {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;
  // Se guarda junto al userId al que pertenece: si no coincide con el actual, aún está cargando.
  const [state, setState] = useState<Cached | null>(readCache);
  const [photo, setPhoto] = useState<ProfilePhoto | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false; // si el usuario cambia antes de que responda, se ignora la respuesta vieja
    fetchProfile(userId).then(
      (profile) => {
        if (cancelled) return;
        writeCache(userId, profile);
        setState({ userId, profile, failed: false });
      },
      // Sin internet: se sigue con el perfil guardado de este usuario, si lo hay.
      () =>
        !cancelled &&
        setState((prev) =>
          prev?.userId === userId && prev.profile ? { ...prev, failed: true } : { userId, profile: null, failed: true },
        ),
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Al cerrar sesión se borra el perfil guardado (en un celular compartido no debe quedar a la vista).
  useEffect(() => {
    if (!authLoading && !userId) localStorage.removeItem(CACHE_KEY);
  }, [authLoading, userId]);

  const current = userId && state?.userId === userId ? state : null;
  const photoPath = current?.profile?.photo_path ?? null;

  // El bucket es privado: cada vez que cambia la foto se pide un enlace temporal para mostrarla.
  useEffect(() => {
    if (!photoPath) return;
    let cancelled = false;
    photoUrl(photoPath).then(
      (uri) => !cancelled && setPhoto((p) => (p?.key === photoPath ? p : { uri, key: photoPath })),
      () => {}, // sin enlace se muestra el avatar o la inicial
    );
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  async function save(profile: Profile, newPhotoUri?: string) {
    if (!userId) return;
    const oldPath = current?.profile?.photo_path;
    const saved = await saveProfile(userId, profile, newPhotoUri);
    writeCache(userId, saved);
    // La foto recién elegida se muestra desde el archivo local, sin esperar a descargarla.
    if (newPhotoUri && saved.photo_path) setPhoto({ uri: newPhotoUri, key: saved.photo_path });
    setState({ userId, profile: saved, failed: false });
    // Si cambió o se quitó la foto, se borra la anterior (si falla, solo queda un archivo huérfano).
    if (oldPath && oldPath !== saved.photo_path) deletePhoto(oldPath).catch(() => {});
  }

  return (
    <ProfileContext.Provider
      value={{
        profile: current?.profile ?? null,
        photo: photo && photo.key === photoPath ? photo : null,
        loading: !!userId && !current,
        failed: current?.failed ?? false,
        save,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
