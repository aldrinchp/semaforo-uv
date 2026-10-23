// Comprueba la escala UV de la OMS, el horario de protección, los códigos de clima, el cálculo
// sin internet a partir de los datos guardados y las recomendaciones personalizadas.
// Ejecuta: npm run check:uv
import assert from "node:assert/strict";
import { recommendations } from "../src/services/recommendations.ts";
import { minutesToBurn, protectionWindow, uvAt, uvLevel, uvPeak, weatherKind } from "../src/services/uv.ts";

const cases = [
  [0, "low"], [2, "low"], [2.49, "low"], [2.5, "moderate"],
  [5, "moderate"], [6, "high"], [7, "high"], [8, "veryHigh"],
  [10, "veryHigh"], [10.5, "extreme"], [11, "extreme"], [14, "extreme"],
];
for (const [uv, expected] of cases) assert.equal(uvLevel(uv), expected, `UV ${uv}`);

// Horario de protección: desde el primer bloque con índice >= 3 hasta que vuelve a bajar.
const day = (values) => values.map((uv, i) => ({ time: `t${i}`, uv, clearSky: uv }));
assert.deepEqual(protectionWindow(day([0, 2.4, 2.5, 6, 3, 2.4, 0])), { from: "t2", to: "t5" });
assert.deepEqual(protectionWindow(day([0, 4, 1, 5, 0])), { from: "t1", to: "t4" }); // bajada a mitad del día
assert.deepEqual(protectionWindow(day([0, 3, 3])), { from: "t1", to: "24:00" }); // sigue alto al final
assert.equal(protectionWindow(day([0, 1, 2.4, 0])), null);
assert.equal(uvPeak(day([1, 9.5, 9.9, 4])).time, "t2");

const weather = [
  [0, "clear"], [1, "partlyCloudy"], [2, "partlyCloudy"], [3, "cloudy"], [45, "fog"], [48, "fog"],
  [51, "rain"], [67, "rain"], [71, "snow"], [77, "snow"], [80, "rain"], [82, "rain"],
  [85, "snow"], [86, "snow"], [95, "storm"], [99, "storm"],
];
for (const [code, expected] of weather) assert.equal(weatherKind(code), expected, `WMO ${code}`);
// Tiempo hasta quemarse: con UV 9, piel I ~15 min, piel II ~18-19 min, piel VI ~74 min; UV < 1 = sin riesgo.
assert.equal(Math.round(minutesToBurn(9, 1)), 15);
assert.equal(Math.round(minutesToBurn(9, 2)), 19);
assert.equal(Math.round(minutesToBurn(9, 6)), 74);
assert.equal(minutesToBurn(0.5, 1), null);

// Sin internet: con una descarga de las 07:15 de Lima (UTC-5), el UV de cada momento sale de la serie guardada.
const pad = (n) => String(n).padStart(2, "0");
const series = ["2026-10-21", "2026-10-22"].flatMap((date, d) =>
  Array.from({ length: 96 }, (_, i) => ({
    time: `${date}T${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`,
    uv: d * 100 + i, // valor fácil de reconocer: día * 100 + número de bloque
    clearSky: d * 100 + i + 0.5,
  })),
);
const snapshot = {
  fetchedAt: 0,
  utcOffset: -5 * 3600,
  current: { time: "2026-10-21T07:15", uv: 1.23, uvClearSky: 1.5, cloudCover: 40, temperature: 20, humidity: 70, weatherCode: 2 },
  series,
  sun: [
    { date: "2026-10-21", sunrise: "05:40", sunset: "18:05" },
    { date: "2026-10-22", sunrise: "05:39", sunset: "18:06" },
  ],
  week: [],
  place: null,
};
const lima = (day, h, m) => Date.UTC(2026, 9, day, h + 5, m); // hora de Lima -> instante UTC

let v = uvAt(snapshot, lima(21, 7, 20)); // mismo bloque que la descarga: valores "actuales"
assert.deepEqual([v.date, v.now, v.uv, v.weatherTime], ["2026-10-21", "07:15", 1.23, null]);
v = uvAt(snapshot, lima(21, 11, 5)); // más tarde, sin internet: previsto para las 11:00 (bloque 44)
assert.deepEqual([v.now, v.uv, v.uvClearSky, v.weatherTime, v.isDay], ["11:00", 44, 44.5, "07:15", true]);
v = uvAt(snapshot, lima(22, 13, 44)); // al día siguiente: día 2, bloque 13:30 (54)
assert.deepEqual([v.date, v.now, v.uv, v.day.length, v.sunrise], ["2026-10-22", "13:30", 154, 96, "05:39"]);
assert.equal(uvAt(snapshot, lima(21, 5, 30)).isDay, false); // antes del amanecer
assert.equal(uvAt(snapshot, lima(23, 12, 0)), null); // lo guardado ya no cubre ese día

// Recomendaciones: el mismo día (UV 9 ahora, pico 10 a las 12:15) para dos personas distintas.
const dia = {
  now: "11:00", uv: 9, level: "veryHigh", peakUv: 10, peakTime: "12:15",
  window: { from: "07:30", to: "16:45" }, tomorrowMax: 10, tomorrowLevel: "veryHigh",
};
const ids = (recs) => recs.map((r) => r.id);
const agricultor = { age_range: "30-49", occupation: "farm", sun_time: "gt4h", sun_period: "all_day", protection: ["hat", "sunscreen"] };
let recs = recommendations({ ...dia, burnNow: minutesToBurn(9, 2), burnPeak: minutesToBurn(10, 2), profile: agricultor });
assert.deepEqual(ids(recs), ["burnNow", "window", "periodAllDay", "exposure", "missing", "occupation"]); // máx. 6
assert.equal(recs[4].item, "sunglasses"); // le faltan los lentes
const estudiante = { age_range: "14-17", occupation: "student", sun_time: "lt30m", sun_period: "midday", protection: ["hat", "sunscreen", "sunglasses"] };
recs = recommendations({ ...dia, burnNow: minutesToBurn(9, 5), burnPeak: minutesToBurn(10, 5), profile: estudiante });
assert.deepEqual(ids(recs), ["burnNow", "window", "periodMidday", "occupation", "age", "tomorrow"]); // 30 min < 40 min hasta quemarse: sin "exposure"
recs = recommendations({ ...dia, burnNow: null, burnPeak: null, profile: { ...estudiante, protection: [] } });
assert.ok(ids(recs).includes("nothing"));
// UV bajo: un solo consejo tranquilo según la hora (más mañana, si será muy alto).
const bajo = { ...dia, uv: 1, level: "low", burnNow: null, burnPeak: null, profile: agricultor };
assert.deepEqual(ids(recommendations({ ...bajo, now: "06:30" })), ["lowLater", "tomorrow"]);
assert.deepEqual(ids(recommendations({ ...bajo, now: "18:00", tomorrowMax: 4 })), ["lowDone"]);
assert.deepEqual(ids(recommendations({ ...bajo, window: null, tomorrowMax: null })), ["lowAllDay"]);

console.log(`OK: ${cases.length} casos de la escala UV y ${weather.length} códigos de clima, el cálculo sin internet y las recomendaciones`);
