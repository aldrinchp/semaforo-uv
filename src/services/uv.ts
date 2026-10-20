// Open-Meteo es abierta y gratuita: no necesita clave de API.
export async function fetchUvIndex(latitude: number, longitude: number): Promise<number> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${latitude}&longitude=${longitude}&current=uv_index&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);

  const data = await res.json();
  const uv = data.current?.uv_index;
  if (typeof uv !== "number") throw new Error("Open-Meteo no devolvió uv_index");
  return uv;
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

// Colores oficiales de la OMS y el color de texto que se lee bien encima de cada uno.
export const uvColors: Record<UvLevel, { background: string; text: string }> = {
  low: { background: "#289500", text: "#fff" },
  moderate: { background: "#F7E400", text: "#000" },
  high: { background: "#F85900", text: "#000" },
  veryHigh: { background: "#D8001D", text: "#fff" },
  extreme: { background: "#6B49C8", text: "#fff" },
};
