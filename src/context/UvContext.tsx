import "expo-sqlite/localStorage/install";
import { createContext, useContext, useEffect, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { fetchForecast, fetchWeek, uvAt, type UvData, type UvSnapshot } from "@/services/uv";

export type { UvData } from "@/services/uv";

// En qué paso falló: sin permiso, GPS sin respuesta o sin internet / API caída.
export type UvError = "permission" | "location" | "network";

// La última descarga se guarda en el celular (mismo almacenamiento que la sesión) para usarla sin internet.
const CACHE_KEY = "uvCache";

function readCache(): UvSnapshot | null {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
  } catch {
    return null; // guardado dañado o de una versión anterior: se ignora
  }
}

const saveCache = (snapshot: UvSnapshot) => localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));

// `place`: el nombre del lugar, que llega aparte (ver abajo).
type Download = { snapshot: UvSnapshot | null; error: UvError | null; place?: Promise<string | null> };

// Permiso -> coordenadas -> Open-Meteo. Si todo sale bien, guarda la descarga en el celular.
// No toca estado de React; solo devuelve el resultado.
async function download(): Promise<Download> {
  let step: UvError = "permission";
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) throw new Error("Permiso de ubicación denegado");

    step = "location";
    // Balanced (~100 m) basta para el UV y es más rápido que High.
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    step = "network";
    // El nombre del lugar es un extra y el servicio del teléfono que lo calcula a veces es lento:
    // se pide a la vez, pero no se le espera para mostrar el UV. Si falla, seguimos sin él.
    const geocode = Location.reverseGeocodeAsync(coords).then(
      ([a]) => (a ? [a.city ?? a.subregion ?? a.region, a.isoCountryCode].filter(Boolean).join(", ") || null : null),
      () => null,
    );
    const [forecast, week] = await Promise.all([
      fetchForecast(coords.latitude, coords.longitude),
      fetchWeek(coords.latitude, coords.longitude),
    ]);
    // Mientras llega el nombre nuevo se deja el anterior, para que no parpadee "Tu ubicación".
    const snapshot: UvSnapshot = { ...forecast, week, place: readCache()?.place ?? null, fetchedAt: Date.now() };
    saveCache(snapshot);
    const place = geocode.then((p) => {
      saveCache({ ...snapshot, place: p });
      return p;
    });
    return { snapshot, error: null, place };
  } catch {
    return { snapshot: null, error: step };
  }
}

// data: lo que se muestra (null si no hay nada guardado o si lo guardado ya no cubre hoy).
// error: por qué falló la última actualización; si hay `data`, se están mostrando datos guardados.
type UvState = { data: UvData | null; error: UvError | null; loading: boolean; refresh: () => void };
type Status = { loading: boolean; error: UvError | null };

// Descarga y pasa el resultado al estado. El nombre del lugar se completa cuando llega, solo si
// sigue siendo de la misma descarga.
function load(setSnapshot: Dispatch<SetStateAction<UvSnapshot | null>>, setStatus: Dispatch<SetStateAction<Status>>) {
  download().then(({ snapshot: fresh, error, place }) => {
    if (fresh) setSnapshot(fresh);
    setStatus({ loading: false, error });
    place?.then((p) => setSnapshot((s) => (s && s.fetchedAt === fresh?.fetchedAt ? { ...s, place: p } : s)));
  });
}

const UvContext = createContext<UvState>({ data: null, error: null, loading: true, refresh: () => {} });

// Datos compartidos por las pestañas Hoy y Dashboard (el GPS y la API se consultan una sola vez).
// Al abrir se muestra al instante lo guardado y se actualiza por detrás; si no se puede actualizar
// (sin internet o sin GPS), se sigue mostrando lo guardado.
export function UvProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState(readCache);
  const [status, setStatus] = useState<Status>({ loading: true, error: null });
  const [now, setNow] = useState(Date.now);

  useEffect(() => load(setSnapshot, setStatus), []);

  // El "UV actual" se recalcula con la hora del celular: cada minuto y al volver a la app.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    const sub = AppState.addEventListener("change", (state) => state === "active" && setNow(Date.now()));
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  function refresh() {
    setStatus((prev) => ({ ...prev, loading: true }));
    setNow(Date.now());
    load(setSnapshot, setStatus);
  }

  const data = snapshot ? uvAt(snapshot, now) : null;
  return <UvContext.Provider value={{ data, ...status, refresh }}>{children}</UvContext.Provider>;
}

export const useUvIndex = () => useContext(UvContext);
