import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useLanguage } from "@/context/LanguageContext";
import { UvHeader } from "@/components/UvHeader";
import { useProfile } from "@/context/ProfileContext";
import type { Device, DeviceNow } from "@/services/devices";
import { minutesToBurn } from "@/services/uv";
import { colors, ui } from "@/theme";

// Cabecera de un semáforo (lista y mapa): su UV en el círculo de color, nombre y lugar · distancia.
export function DeviceHeader({
  device,
  state,
  distance,
  chevron,
}: {
  device: Device;
  state: DeviceNow;
  distance: number | null;
  chevron?: boolean;
}) {
  const { t } = useLanguage();
  const away =
    distance === null
      ? null
      : t.away(distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`);
  return (
    <UvHeader
      uv={state.uv}
      muted={!state.online}
      title={device.name}
      subtitle={[device.place, away].filter(Boolean).join(" · ")}
      chevron={chevron}
    />
  );
}

// Estado de un semáforo: "● EN VIVO" (con un punto que late), "Actualizado hace 2 min",
// "Sin conexión desde las 10:42" o "Todavía no envió lecturas".
export function ReadingStatus({ state, now }: { state: DeviceNow; now: number }) {
  const { t, lang } = useLanguage();

  if (state.live) {
    return (
      <View style={styles.row}>
        <PulsingDot />
        <Text style={styles.live}>{t.live}</Text>
      </View>
    );
  }

  let text = t.noReadingsYet;
  if (state.lastSeen && state.online) {
    text = t.updatedAgo(Math.max(1, Math.round((now - state.lastSeen) / 60000)));
  } else if (state.lastSeen) {
    const date = new Date(state.lastSeen);
    const sameDay = date.toDateString() === new Date(now).toDateString();
    text = t.offlineSince(
      date.toLocaleString(
        lang,
        sameDay
          ? { hour: "2-digit", minute: "2-digit" }
          : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
      ),
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: state.online ? LIVE_GREEN : colors.muted }]} />
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

const LIVE_GREEN = "#2e7d32";

// Punto verde que late suavemente (no se anima si el teléfono tiene "reducir movimiento").
function PulsingDot() {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => !reduce && !cancelled && pulse.start());
    return () => {
      cancelled = true;
      pulse.stop();
    };
  }, [opacity]);
  return <Animated.View style={[styles.dot, styles.liveDot, { opacity }]} />;
}

// "Con tu tipo de piel te quemarías en ~15 min sin protección", con el tipo de piel del perfil.
// No muestra nada si el usuario no tiene perfil.
export function BurnTime({ uv }: { uv: number }) {
  const { t } = useLanguage();
  const skinType = useProfile().profile?.skin_type;
  if (!skinType) return null;
  const minutes = minutesToBurn(uv, skinType);
  return (
    <View style={styles.row}>
      <SymbolView name={{ ios: "timer", android: "timer" }} tintColor={colors.accent} size={20} />
      <Text style={[ui.body, styles.flex]}>{minutes === null ? t.noBurnRisk : t.burnIn(t.duration(minutes))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LIVE_GREEN,
  },
  live: {
    color: LIVE_GREEN,
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  flex: {
    flex: 1,
  },
});
