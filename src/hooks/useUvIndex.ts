import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { fetchUvIndex } from "@/services/uv";

// En qué paso falló: sin permiso, GPS sin respuesta o sin internet / API caída.
export type UvError = "permission" | "location" | "network";

type UvResult = { uv: number | null; error: UvError | null };

// Permiso -> coordenadas -> Open-Meteo. No toca estado de React; solo devuelve el resultado.
async function getUv(): Promise<UvResult> {
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
    return { uv: await fetchUvIndex(coords.latitude, coords.longitude), error: null };
  } catch {
    return { uv: null, error: step };
  }
}

export function useUvIndex() {
  const [state, setState] = useState<UvResult & { loading: boolean }>({
    uv: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    getUv().then((result) => setState({ ...result, loading: false }));
  }, []);

  function refresh() {
    setState((prev) => ({ ...prev, loading: true }));
    getUv().then((result) => setState({ ...result, loading: false }));
  }

  return { ...state, refresh };
}
