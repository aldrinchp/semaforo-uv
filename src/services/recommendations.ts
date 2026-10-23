// Recomendaciones personalizadas: combina el UV de hoy (pronóstico) con el perfil de la persona.
// Solo lógica: devuelve qué consejos dar y con qué datos; el texto lo pone la app en su idioma
// (t.recs en strings.ts). Los cálculos de UV llegan ya hechos, así este archivo se puede probar solo.
import type { Profile } from "./profile";
import type { UvLevel } from "./uv";

type Protection = Profile["protection"][number];

export type RecInput = {
  now: string; // "HH:MM" del bloque de 15 min actual
  uv: number;
  level: UvLevel;
  burnNow: number | null; // minutos hasta quemarse ahora con su piel (null = riesgo mínimo o sin perfil)
  peakUv: number;
  peakTime: string;
  burnPeak: number | null; // minutos hasta quemarse en el pico del día
  window: { from: string; to: string } | null; // horario de protección de hoy (UV >= 3)
  tomorrowMax: number | null;
  tomorrowLevel: UvLevel | null;
  profile: Pick<Profile, "age_range" | "occupation" | "sun_time" | "sun_period" | "protection"> | null;
};

// Cada consejo lleva exactamente los datos que necesita su texto.
export type Rec =
  | { id: "lowAllDay" | "lowDone" | "periodAllDay" | "nothing" }
  | { id: "lowLater" | "window"; from: string; to: string }
  | { id: "burnNow"; minutes: number; uv: number; level: UvLevel }
  | { id: "periodMidday"; uv: number; time: string }
  | { id: "periodMorning"; from: string }
  | { id: "periodAfternoon"; to: string }
  | { id: "exposure"; sunTime: Profile["sun_time"]; minutes: number }
  | { id: "missing"; item: Protection }
  | { id: "occupation"; occupation: Profile["occupation"] }
  | { id: "age"; age: "14-17" | "65+" }
  | { id: "tomorrow"; uv: number; level: UvLevel };

const MAX_RECS = 6; // la primera va en la barra azul; el resto, en la tarjeta (si sobran, se cortan las últimas)

// Tiempo máximo al sol de cada respuesta del perfil, en minutos.
const SUN_MINUTES = { lt30m: 30, "30m-2h": 120, "2h-4h": 240, gt4h: 480 } as const;

// Consejos de hoy, del más importante al menos importante.
export function recommendations(i: RecInput): Rec[] {
  const recs: Rec[] = [];
  const tomorrow = () => {
    if (i.tomorrowMax !== null && i.tomorrowLevel && i.tomorrowMax >= 7.5) {
      recs.push({ id: "tomorrow", uv: Math.round(i.tomorrowMax), level: i.tomorrowLevel });
    }
  };

  // UV bajo ahora: un mensaje tranquilo (y si más tarde sube, desde qué hora protegerse).
  if (i.level === "low") {
    if (!i.window) recs.push({ id: "lowAllDay" });
    else if (i.now < i.window.to) recs.push({ id: "lowLater", from: i.window.from, to: i.window.to });
    else recs.push({ id: "lowDone" });
    tomorrow();
    return recs;
  }

  if (i.burnNow !== null) recs.push({ id: "burnNow", minutes: i.burnNow, uv: Math.round(i.uv), level: i.level });
  if (i.window) recs.push({ id: "window", from: i.window.from, to: i.window.to });

  const p = i.profile;
  if (p) {
    // ¿Su horario al sol coincide con el de riesgo?
    if (i.window) {
      if (p.sun_period === "all_day") recs.push({ id: "periodAllDay" });
      else if (p.sun_period === "midday") recs.push({ id: "periodMidday", uv: Math.round(i.peakUv), time: i.peakTime });
      else if (p.sun_period === "morning" && i.window.from < "10:00") recs.push({ id: "periodMorning", from: i.window.from });
      else if (p.sun_period === "afternoon" && i.window.to > "15:00") recs.push({ id: "periodAfternoon", to: i.window.to });
    }

    // ¿Pasa al sol más tiempo del que tarda en quemarse en el pico?
    if (i.burnPeak !== null && SUN_MINUTES[p.sun_time] > i.burnPeak) {
      recs.push({ id: "exposure", sunTime: p.sun_time, minutes: i.burnPeak });
    }

    // Lo que le falta de protección: si no usa nada, un aviso fuerte; si no, lo primero que le falte.
    // La manga larga solo se pide a quien pasa de 2 a 4 horas o más al sol.
    if (p.protection.length === 0) {
      recs.push({ id: "nothing" });
    } else {
      const needed: Protection[] = ["sunscreen", "hat", "sunglasses"];
      if (SUN_MINUTES[p.sun_time] >= 240) needed.push("long_sleeves");
      const missing = needed.find((item) => !p.protection.includes(item));
      if (missing) recs.push({ id: "missing", item: missing });
    }

    recs.push({ id: "occupation", occupation: p.occupation });
    if (p.age_range === "14-17" || p.age_range === "65+") recs.push({ id: "age", age: p.age_range });
  }

  tomorrow();
  return recs.slice(0, MAX_RECS);
}
