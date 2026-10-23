import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { BurnTime, DeviceHeader, ReadingStatus } from "@/components/DeviceStatus";
import { Segmented } from "@/components/Segmented";
import { SemaforosMap, type MapItem } from "@/components/SemaforosMap";
import { useLanguage } from "@/context/LanguageContext";
import { useLiveValues } from "@/hooks/useLiveValues";
import {
  distanceKm,
  fetchDevices,
  deviceNow,
  fetchLatestReadings,
  type Live,
} from "@/services/devices";
import { colors, ui } from "@/theme";

type Item = MapItem;
type Loaded = {
  items: Item[];
  position: { latitude: number; longitude: number } | null;
};

// Posición aproximada del teléfono, solo para ordenar por cercanía. Usa la última conocida si es
// reciente (instantáneo); si no hay permiso o falla, la lista sale sin distancias.
async function phonePosition() {
  try {
    const last = await Location.getLastKnownPositionAsync({
      maxAge: 10 * 60 * 1000,
    });
    return (
      last ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }))
    ).coords;
  } catch {
    return null;
  }
}

// Semáforos con su última lectura, del más cercano al más lejano (los que no tienen coordenadas, al final).
async function loadItems(): Promise<Loaded> {
  const [devices, position] = await Promise.all([fetchDevices(), phonePosition()]);
  const latest = await fetchLatestReadings(devices.map((d) => d.id));
  const items = devices.map((device) => ({
    device,
    reading: latest[device.id],
    distance:
      position && device.latitude != null && device.longitude != null
        ? distanceKm(position.latitude, position.longitude, device.latitude, device.longitude)
        : null,
  }));
  items.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  return { items, position };
}

// Pestaña "Semáforos": el estado actual de cada semáforo, en lista o en mapa. Se actualiza sola cada
// minuto mientras está a la vista (el valor en vivo llega al instante por Realtime).
export default function Semaforos() {
  const { t } = useLanguage();
  const [view, setView] = useState<"list" | "map">("list");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now()); // se actualiza con cada carga
  const live = useLiveValues();

  const load = useCallback(() => {
    loadItems()
      .then((data) => {
        setLoaded(data);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => {
        setRefreshing(false);
        setNow(Date.now());
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, 60 * 1000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const items = loaded?.items ?? null;
  const error = failed && (
    <View style={ui.card}>
      <Text style={ui.body}>{t.semaphoresError}</Text>
    </View>
  );

  return (
    <View style={ui.screen}>
      <View style={styles.top}>
        <Segmented
          options={[
            { value: "list", label: t.viewList },
            { value: "map", label: t.viewMap },
          ]}
          value={view}
          onChange={setView}
        />
      </View>

      {view === "map" && loaded ? (
        <>
          {error}
          <SemaforosMap items={loaded.items} live={live} now={now} position={loaded.position} />
        </>
      ) : (
        <ScrollView
          style={ui.screen}
          contentContainerStyle={ui.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
        >
          <Text style={styles.intro}>{t.semaphoresIntro}</Text>
          {error}
          {items === null ? (
            !failed && <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
          ) : items.length === 0 ? (
            <View style={ui.card}>
              <Text style={ui.body}>{t.noSemaphores}</Text>
            </View>
          ) : (
            items.map((item) => (
              <DeviceCard key={item.device.id} item={item} live={live[item.device.id]} now={now} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function DeviceCard({ item, live, now }: { item: Item; live: Live | undefined; now: number }) {
  const { device, reading, distance } = item;
  const state = deviceNow(reading, live, now);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/semaforo/[id]", params: { id: device.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [ui.card, !state.online && styles.offline, pressed && styles.pressed]}
    >
      <DeviceHeader device={device} state={state} distance={distance} chevron />
      {/* Si el semáforo no está en línea, su UV ya no es actual: no se calcula el tiempo hasta quemarse. */}
      {state.uv !== null && state.online && <BurnTime uv={state.uv} />}
      <ReadingStatus state={state} now={now} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  intro: {
    color: colors.muted,
    fontSize: 14,
  },
  loader: {
    marginVertical: 48,
  },
  offline: {
    opacity: 0.6,
  },
  pressed: {
    backgroundColor: "#F5F9FC",
  },
});
