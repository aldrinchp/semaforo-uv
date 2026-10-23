import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";

const BUCKET = "avatars"; // privado: ver supabase/profiles.sql (sección 5)

// Abre la cámara o la galería con recorte cuadrado y devuelve la foto ya reducida (archivo local),
// o null si el usuario canceló. Lanza Error("camera_denied") si no dio permiso de cámara.
export async function pickPhoto(source: "camera" | "library"): Promise<string | null> {
  if (source === "camera") {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) throw new Error("camera_denied");
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1] };
  const result = await (source === "camera"
    ? ImagePicker.launchCameraAsync(options)
    : ImagePicker.launchImageLibraryAsync(options));
  if (result.canceled) return null;

  // 512 px en JPEG comprimido: de 3-5 MB pasa a ~50-100 KB (sube rápido con mala señal).
  const context = ImageManipulator.manipulate(result.assets[0].uri);
  context.resize({ width: 512 });
  const image = await context.renderAsync();
  const { uri } = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
  return uri;
}

// Sube la foto a la carpeta del usuario con un nombre nuevo cada vez (así nunca se ve una foto
// vieja guardada en caché) y devuelve su ruta dentro del bucket.
export async function uploadPhoto(userId: string, localUri: string): Promise<string> {
  const path = `${userId}/foto-${Date.now()}.jpg`;
  const body = await fetch(localUri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

export async function deletePhoto(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

// El bucket es privado: para mostrar la foto hace falta un enlace temporal (aquí, 1 hora).
export async function photoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
