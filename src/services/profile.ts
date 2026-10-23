import { supabase } from "@/lib/supabase";
import { uploadPhoto } from "@/services/photo";

// Opciones de cada pregunta. Son las mismas claves que acepta la tabla `profiles`
// (ver supabase/profiles.sql); el texto que ve el usuario lo pone la app en su idioma.
export const AGE_RANGES = ["14-17", "18-29", "30-49", "50-64", "65+"] as const;
export const OCCUPATIONS = ["student", "teacher", "farm", "market", "outdoor", "indoor", "other"] as const;
export const SUN_TIMES = ["lt30m", "30m-2h", "2h-4h", "gt4h"] as const;
export const SUN_PERIODS = ["morning", "midday", "afternoon", "all_day"] as const;
export const PROTECTIONS = ["hat", "sunglasses", "sunscreen", "long_sleeves"] as const; // [] = "Nada"
export const SKIN_TYPES = [1, 2, 3, 4, 5, 6] as const;

// Avatares prediseñados (opcional). En la tabla se guarda la clave; el emoji lo dibuja el teléfono.
export const AVATARS = {
  farmer_w: "👩‍🌾",
  farmer_m: "👨‍🌾",
  student_w: "👩‍🎓",
  student_m: "👨‍🎓",
  teacher_w: "👩‍🏫",
  teacher_m: "👨‍🏫",
  office_w: "👩‍💼",
  office_m: "👨‍💼",
  worker_w: "👷‍♀️",
  worker_m: "👷‍♂️",
  elder_w: "👵",
  elder_m: "👴",
  woman: "👩",
  man: "👨",
  sun: "🌞",
  sunflower: "🌻",
};
export type AvatarKey = keyof typeof AVATARS;

// Los nombres de los campos son los de las columnas de la tabla, así no hay que convertirlos.
export type Profile = {
  first_name: string;
  last_name: string;
  age_range: (typeof AGE_RANGES)[number];
  occupation: (typeof OCCUPATIONS)[number];
  sun_time: (typeof SUN_TIMES)[number];
  sun_period: (typeof SUN_PERIODS)[number];
  protection: (typeof PROTECTIONS)[number][];
  skin_type: (typeof SKIN_TYPES)[number];
  avatar: AvatarKey | null; // null = no eligió ninguno
  photo_path: string | null; // ruta de la foto propia en el bucket privado; null = sin foto
};

// Perfil del usuario, o null si todavía no lo ha llenado.
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, last_name, age_range, occupation, sun_time, sun_period, protection, skin_type, avatar, photo_path")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Crea el perfil o lo reemplaza si ya existe (sirve para el primer llenado y para editarlo).
// Si hay `newPhotoUri` (foto recién elegida), primero la sube y guarda su ruta en el perfil.
// Devuelve el perfil tal como quedó guardado (nombre y apellido sin espacios sobrantes).
export async function saveProfile(userId: string, profile: Profile, newPhotoUri?: string): Promise<Profile> {
  const clean = { ...profile, first_name: profile.first_name.trim(), last_name: profile.last_name.trim() };
  if (newPhotoUri) clean.photo_path = await uploadPhoto(userId, newPhotoUri);
  const { error } = await supabase.from("profiles").upsert({ ...clean, id: userId });
  if (error) throw error;
  return clean;
}
