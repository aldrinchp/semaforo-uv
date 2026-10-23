import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { AVATARS, type AvatarKey } from "@/services/profile";

// Círculo con, por orden de prioridad: la foto propia, el avatar elegido (emoji) o `fallback`
// (inicial o icono). `photo.key` identifica la foto en la caché aunque cambie su enlace temporal.
export function Avatar({
  photo,
  avatar,
  size,
  fallback,
  style,
}: {
  photo?: { uri: string; key: string } | null;
  avatar?: AvatarKey | null;
  size: number;
  fallback: ReactNode;
  style?: ViewStyle;
}) {
  const circle = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.circle, circle, style]}>
      {photo ? (
        <Image source={{ uri: photo.uri, cacheKey: photo.key }} style={circle} contentFit="cover" />
      ) : avatar ? (
        <Text style={[styles.emoji, { fontSize: size * 0.55, lineHeight: size * 0.75 }]}>{AVATARS[avatar]}</Text>
      ) : (
        fallback
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  emoji: {
    textAlign: "center",
    includeFontPadding: false, // Android: sin esto el emoji queda desplazado hacia abajo
  },
});
