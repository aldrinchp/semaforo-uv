// Un bloque de 15 minutos: hora "HH:MM" (o "2026-10-21T16:15" en la serie guardada), UV previsto
// y UV si no hubiera nubes.
export type UvPoint = { time: string; uv: number; clearSky: number };

// Máximo de UV de un día ("2026-10-20"), con nubes y sin nubes.
export type UvDay = { date: string; uvMax: number; clearSkyMax: number };

export const PAST_DAYS = 7;
const FORECAST_DAYS = 8; // hoy y 7 días más: así el UV actual se puede calcular hasta 7 días sin internet

// Lo que se descarga de Open-Meteo y se guarda en el celular para poder usarlo sin internet.
// Las horas son las del lugar (Open-Meteo las da con timezone=auto).
export type UvSnapshot = {
  fetchedAt: number; // momento de la descarga (Date.now())
  utcOffset: number; // segundos respecto a UTC del lugar, para saber su hora local sin internet
  current: {
    time: string; // bloque de 15 min de la descarga, "2026-10-21T07:15"
    uv: number;
    uvClearSky: number;
    cloudCover: number;
    temperature: number;
    humidity: number;
    weatherCode: number;
  };
  series: UvPoint[]; // cada 15 min, de hoy a 7 días más
  sun: { date: string; sunrise: string; sunset: string }[];
  week: UvDay[]; // máximo diario: 7 días antes, hoy y 7 después
  place: string | null;
};

// Lo que ven las pantallas: el momento actual calculado a partir de lo guardado.
export type UvData = {
  date: string; // "2026-10-21" (hoy en el lugar)
  now: string; // "HH:MM" del bloque de 15 min actual
  uv: number;
  uvClearSky: number;
  cloudCover: number;
  temperature: number;
  humidity: number;
  weatherCode: number;
  weatherTime: string | null; // "07:15" si el clima es de otro momento (sin internet); null si es de ahora
  isDay: boolean;
  sunrise: string;
  sunset: string;
  day: UvPoint[]; // UV de hoy cada 15 minutos ("00:00" a "23:45")
  week: UvDay[];
  place: string | null;
  fetchedAt: number;
};

const hhmm = (isoTime: string) => isoTime.slice(11, 16); // "2026-10-20T16:15" -> "16:15"
const pad = (n: number) => String(n).padStart(2, "0");

// Open-Meteo es abierta y gratuita: no necesita clave de API.
async function openMeteo(params: string) {
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}&timezone=auto`);
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  return res.json();
}

// En una sola llamada: UV y clima actuales, UV cada 15 min de hoy y 7 días más (la misma resolución
// que el valor actual), y amanecer/atardecer de esos días.
export async function fetchForecast(
  latitude: number,
  longitude: number,
): Promise<Pick<UvSnapshot, "utcOffset" | "current" | "series" | "sun">> {
  const {
    utc_offset_seconds: utcOffset,
    current: c,
    minutely_15: m,
    daily,
  } = await openMeteo(
    `latitude=${latitude}&longitude=${longitude}` +
      "&current=uv_index,uv_index_clear_sky,cloud_cover,temperature_2m,relative_humidity_2m,weather_code" +
      `&minutely_15=uv_index,uv_index_clear_sky&daily=sunrise,sunset&forecast_days=${FORECAST_DAYS}`,
  );
  const values = [
    c?.uv_index,
    c?.uv_index_clear_sky,
    c?.cloud_cover,
    c?.temperature_2m,
    c?.relative_humidity_2m,
    c?.weather_code,
  ];
  if (
    typeof utcOffset !== "number" ||
    typeof c?.time !== "string" ||
    !values.every((v) => typeof v === "number") ||
    !m?.time?.length ||
    !daily?.time?.length
  ) {
    throw new Error("Open-Meteo devolvió datos incompletos");
  }
  const [uv, uvClearSky, cloudCover, temperature, humidity, weatherCode] = values;
  return {
    utcOffset,
    current: { time: c.time, uv, uvClearSky, cloudCover, temperature, humidity, weatherCode },
    series: m.time.map((time: string, i: number) => ({
      time,
      uv: m.uv_index[i] ?? 0,
      clearSky: m.uv_index_clear_sky[i] ?? 0,
    })),
    sun: daily.time.map((date: string, i: number) => ({
      date,
      sunrise: hhmm(daily.sunrise[i] ?? ""),
      sunset: hhmm(daily.sunset[i] ?? ""),
    })),
  };
}

// Los 7 días anteriores, hoy y los 7 siguientes (15 días). Va aparte de fetchForecast para no
// traer la serie de 15 minutos de 15 días. Los días pasados también son valores del modelo.
export async function fetchWeek(latitude: number, longitude: number): Promise<UvDay[]> {
  const { daily } = await openMeteo(
    `latitude=${latitude}&longitude=${longitude}` +
      `&daily=uv_index_max,uv_index_clear_sky_max&past_days=${PAST_DAYS}&forecast_days=${PAST_DAYS + 1}`,
  );
  if (daily?.time?.length !== PAST_DAYS * 2 + 1) throw new Error("Open-Meteo devolvió datos incompletos");
  return daily.time.map((date: string, i: number) => ({
    date,
    uvMax: daily.uv_index_max[i] ?? 0,
    clearSkyMax: daily.uv_index_clear_sky_max[i] ?? 0,
  }));
}

// Calcula lo que hay que mostrar en el momento `nowMs` usando solo lo guardado (sirve sin internet):
// toma el día y el bloque de 15 min que tocan según la hora del lugar. Devuelve null si lo guardado
// ya no cubre hoy (más de 7 días sin actualizar).
// ponytail: usa un solo desfase horario; si el lugar cambia de horario de verano en esos 7 días,
// la hora queda corrida 1 h hasta la próxima descarga.
export function uvAt(s: UvSnapshot, nowMs: number): UvData | null {
  const local = new Date(nowMs + s.utcOffset * 1000).toISOString(); // en UTC = hora local del lugar
  const date = local.slice(0, 10);
  const minutes = Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));
  const block = minutes - (minutes % 15);
  const now = `${pad(Math.floor(block / 60))}:${pad(block % 60)}`;

  const day = s.series.filter((p) => p.time.startsWith(date)).map((p) => ({ ...p, time: hhmm(p.time) }));
  const point = day.find((p) => p.time === now);
  const sun = s.sun.find((d) => d.date === date);
  if (!point || !sun) return null;

  // Si la descarga es de este mismo bloque, se usan los valores "actuales" de Open-Meteo;
  // si no, los previstos para este bloque. El clima no se puede prever así: queda el de la descarga.
  const fresh = s.current.time === `${date}T${now}`;
  return {
    date,
    now,
    uv: fresh ? s.current.uv : point.uv,
    uvClearSky: fresh ? s.current.uvClearSky : point.clearSky,
    cloudCover: s.current.cloudCover,
    temperature: s.current.temperature,
    humidity: s.current.humidity,
    weatherCode: s.current.weatherCode,
    weatherTime: fresh ? null : hhmm(s.current.time),
    isDay: now >= sun.sunrise && now < sun.sunset,
    sunrise: sun.sunrise,
    sunset: sun.sunset,
    day,
    week: s.week,
    place: s.place,
    fetchedAt: s.fetchedAt,
  };
}

export type UvLevel = "low" | "moderate" | "high" | "veryHigh" | "extreme";

// Escala de la OMS. El índice oficial es un número entero, por eso se redondea (2.55 -> 3).
export function uvLevel(uv: number): UvLevel {
  const index = Math.round(uv);
  if (index <= 2) return "low";
  if (index <= 5) return "moderate";
  if (index <= 7) return "high";
  if (index <= 10) return "veryHigh";
  return "extreme";
}

// Escala de la OMS: color oficial, color de texto legible encima y rango de cada nivel.
export const uvScale: Record<UvLevel, { background: string; text: string; range: string }> = {
  low: { background: "#289500", text: "#fff", range: "0–2" },
  moderate: { background: "#F7E400", text: "#000", range: "3–5" },
  high: { background: "#F85900", text: "#000", range: "6–7" },
  veryHigh: { background: "#D8001D", text: "#fff", range: "8–10" },
  extreme: { background: "#6B49C8", text: "#fff", range: "11+" },
};

// Bloque con el UV más alto del día (de ahí sale el "UV máximo hoy" y la hora del pico).
export const uvPeak = (day: UvPoint[]) => day.reduce((a, b) => (b.uv > a.uv ? b : a));

// La OMS recomienda protegerse desde índice 3. Devuelve desde qué hora y hasta qué hora
// el índice (redondeado) es 3 o más, o null si hoy no llega a 3.
export function protectionWindow(day: UvPoint[]): { from: string; to: string } | null {
  const first = day.findIndex((p) => Math.round(p.uv) >= 3);
  if (first === -1) return null;
  const last = day.findLastIndex((p) => Math.round(p.uv) >= 3);
  return { from: day[first].time, to: day[last + 1]?.time ?? "24:00" };
}

// Dosis de UV (J/m²) que enrojece la piel sin protección, por tipo de piel I a VI (Fitzpatrick).
// Valores orientativos: la parte baja del rango de la "dosis eritemática mínima" de cada tipo.
const BURN_DOSE = [200, 250, 350, 450, 600, 1000];

// Minutos hasta quemarse sin protección con ese UV. Cada punto de índice UV equivale a 0,025 W/m²
// de radiación que quema (escala de la OMS). null si el UV es tan bajo que el riesgo es mínimo.
export function minutesToBurn(uv: number, skinType: number): number | null {
  if (uv < 1) return null;
  return BURN_DOSE[skinType - 1] / (uv * 0.025 * 60);
}

export type WeatherKind = "clear" | "partlyCloudy" | "cloudy" | "fog" | "rain" | "snow" | "storm";

// Agrupa los códigos WMO que devuelve Open-Meteo (0 despejado, 45-48 niebla, 51-67 llovizna/lluvia,
// 71-77 nieve, 80-82 chubascos, 85-86 chubascos de nieve, 95-99 tormenta).
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return "clear";
  if (code <= 2) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 67 || (code >= 80 && code <= 82)) return "rain";
  if (code <= 86) return "snow";
  return "storm";
}
