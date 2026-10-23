import { supabase } from "@/lib/supabase";
import type { UvPoint } from "@/services/uv";

// Semáforo UV físico (tabla `devices`, ver supabase/semaforos.sql).
export type Device = {
  id: string;
  name: string;
  place: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Lectura de un minuto enviada por el semáforo. measured_at viene en UTC (ISO 8601).
export type Reading = { measured_at: string; uv_avg: number; uv_max: number };

// El semáforo envía una lectura por minuto: si pasan 5 minutos sin ninguna, perdió la conexión
// (o se apagó).
export const OFFLINE_AFTER_MS = 5 * 60 * 1000;

// Valor en vivo (tabla `device_live`): el UV del momento, que el semáforo reemplaza cuando cambia
// o cada 30 s. updated_at es la hora de llegada a Supabase.
export type Live = { device_id: string; uv: number; updated_at: string };

// Con un envío al menos cada 30 s, si pasan 90 s sin noticias el valor ya no es "en vivo".
const LIVE_FRESH_MS = 90 * 1000;

// Una lectura resume un minuto: measured_at es su inicio, así que el dato es de 60 s después.
export const readingTime = (r: Reading) => Date.parse(r.measured_at) + 60 * 1000;

// Qué mostrar de un semáforo ahora: el valor en vivo si es reciente; si no, la última lectura por minuto.
export type DeviceNow = {
  uv: number | null;
  live: boolean; // valor de hace menos de 90 s
  online: boolean; // dio noticias en los últimos 5 min
  lastSeen: number | null; // última vez que dio noticias (ms)
};

export function deviceNow(reading: Reading | null, live: Live | undefined, now: number): DeviceNow {
  const liveAt = live ? Date.parse(live.updated_at) : 0;
  if (live && now - liveAt <= LIVE_FRESH_MS) return { uv: live.uv, live: true, online: true, lastSeen: liveAt };
  const lastSeen = Math.max(reading ? readingTime(reading) : 0, liveAt) || null;
  return {
    uv: reading?.uv_avg ?? live?.uv ?? null,
    live: false,
    online: lastSeen !== null && now - lastSeen <= OFFLINE_AFTER_MS,
    lastSeen,
  };
}

export async function fetchLive(): Promise<Live[]> {
  const { data, error } = await supabase.from("device_live").select("device_id, uv, updated_at");
  if (error) throw error;
  return data;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Lecturas de un día agrupadas en los 96 bloques de 15 minutos (hora local del teléfono), con el
// promedio de cada bloque: el mismo formato que la gráfica del pronóstico. Bloque sin lecturas = NaN.
export function readingsToBlocks(readings: Reading[]): UvPoint[] {
  const sums = new Array<number>(96).fill(0);
  const counts = new Array<number>(96).fill(0);
  for (const r of readings) {
    const d = new Date(Date.parse(r.measured_at));
    const block = d.getHours() * 4 + Math.floor(d.getMinutes() / 15);
    sums[block] += r.uv_avg;
    counts[block]++;
  }
  return sums.map((sum, block) => ({
    time: `${pad(Math.floor(block / 4))}:${pad((block % 4) * 15)}`,
    uv: counts[block] ? sum / counts[block] : NaN,
    clearSky: NaN,
  }));
}

const READING_COLUMNS = "measured_at, uv_avg, uv_max";

export async function fetchDevice(id: string): Promise<Device> {
  const { data, error } = await supabase.from("devices").select("id, name, place, latitude, longitude").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function fetchDevices(): Promise<Device[]> {
  const { data, error } = await supabase.from("devices").select("id, name, place, latitude, longitude").order("name");
  if (error) throw error;
  return data;
}

// Última lectura de cada semáforo (null si todavía no envió ninguna).
// ponytail: una consulta por semáforo; si llegan a ser decenas, mejor una vista "última lectura" en Supabase.
export async function fetchLatestReadings(deviceIds: string[]): Promise<Record<string, Reading | null>> {
  const pairs = await Promise.all(
    deviceIds.map(async (id) => {
      const { data, error } = await supabase
        .from("uv_readings")
        .select(READING_COLUMNS)
        .eq("device_id", id)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return [id, data as Reading | null] as const;
    }),
  );
  return Object.fromEntries(pairs);
}

// Lecturas de un semáforo entre `from` (incluido) y `to` (excluido), de la más antigua a la más nueva.
export async function fetchReadingsBetween(deviceId: string, from: Date, to: Date): Promise<Reading[]> {
  const { data, error } = await supabase
    .from("uv_readings")
    .select(READING_COLUMNS)
    .eq("device_id", deviceId)
    .gte("measured_at", from.toISOString())
    .lt("measured_at", to.toISOString())
    .order("measured_at")
    .limit(1440); // un día completo, una por minuto
  if (error) throw error;
  return data;
}

// UV máximo medido por día ("2026-10-22", en la zona horaria del teléfono) de los últimos `days` días.
// Supabase hace las cuentas (función device_daily_max); los días sin lecturas no vienen.
export type DayMax = { day: string; uv_max: number; readings: number };

export async function fetchDailyMax(deviceId: string, days = 7): Promise<DayMax[]> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Guayaquil";
  const { data, error } = await supabase.rpc("device_daily_max", { p_device: deviceId, p_days: days, p_tz: tz });
  if (error) throw error;
  return data;
}

// Distancia en km entre dos puntos (fórmula de haversine): basta para ordenar por cercanía.
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
