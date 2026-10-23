import { Pressable, StyleSheet, Text, View } from "react-native";
import { UvBar } from "@/components/UvDayChart";
import type { UvDay } from "@/services/uv";
import { colors } from "@/theme";

const HEIGHT = 120;

// Mediodía local: sin hora, "2026-10-21" se leería en UTC y podría mostrar el día anterior.
const toDate = (date: string) => new Date(`${date}T12:00`);

// Rango de fechas con el mes escrito: "21–27 de octubre" / "October 21 – 27".
export function formatRange(first: string, last: string, lang: string) {
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long" });
  const [a, b] = [toDate(first), toDate(last)];
  // formatRange junta bien el mes repetido; si el teléfono no lo soporta, se escriben las dos fechas.
  return typeof fmt.formatRange === "function" ? fmt.formatRange(a, b) : `${fmt.format(a)} – ${fmt.format(b)}`;
}

// Máximo de UV de cada día (7 columnas): número arriba, barra, día de la semana y número del día.
// Las fechas de `best` (días con más UV) van resaltadas con fondo y ★.
// Con `showClearSky`, detrás de cada barra va en gris el máximo sin nubes. La escala lo incluye
// siempre, para que las barras no cambien de altura al encender o apagar el interruptor.
// Un día sin datos (uvMax = NaN, p. ej. semáforo apagado) se muestra con "–" y sin barra.
// Con `onPressDay`, cada día se puede tocar; `selected` marca el elegido con un borde.
export function UvWeekChart({
  days,
  best,
  lang,
  showClearSky,
  selected,
  onPressDay,
}: {
  days: UvDay[];
  best: string[];
  lang: string;
  showClearSky: boolean;
  selected?: string;
  onPressDay?: (date: string) => void;
}) {
  const values = days.flatMap((d) => [d.uvMax, d.clearSkyMax]).filter((v) => !Number.isNaN(v));
  const max = Math.max(11, ...values);

  return (
    <View style={styles.chart}>
      {days.map((d) => {
        const date = toDate(d.date);
        const isBest = best.includes(d.date);
        const hasData = !Number.isNaN(d.uvMax);
        const weekday = date.toLocaleDateString(lang, { weekday: "short" });
        return (
          <Pressable
            key={d.date}
            disabled={!onPressDay}
            onPress={() => onPressDay?.(d.date)}
            style={[styles.column, isBest && styles.bestColumn, d.date === selected && styles.selectedColumn]}
            accessibilityRole={onPressDay ? "button" : undefined}
            accessibilityState={onPressDay ? { selected: d.date === selected } : undefined}
            accessibilityLabel={`${weekday} ${date.getDate()}: ${hasData ? `UV ${Math.round(d.uvMax)}` : "–"}`}
          >
            <Text style={styles.star}>{isBest ? "★" : " "}</Text>
            <Text style={styles.value}>{hasData ? Math.round(d.uvMax) : "–"}</Text>
            <View style={styles.barArea}>
              {hasData && (
                <UvBar uv={d.uvMax} clearSky={showClearSky ? d.clearSkyMax : d.uvMax} max={max} height={HEIGHT} />
              )}
            </View>
            <Text style={styles.weekday}>{weekday}</Text>
            <Text style={styles.day}>{date.getDate()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: "row",
    gap: 2,
  },
  column: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  bestColumn: {
    backgroundColor: "#E1F0F8",
  },
  selectedColumn: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  star: {
    fontSize: 13,
    textAlign: "center",
    color: colors.accent,
  },
  value: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    color: colors.text,
  },
  barArea: {
    height: HEIGHT,
    justifyContent: "flex-end",
  },
  weekday: {
    fontSize: 12,
    textAlign: "center",
    color: colors.muted,
  },
  day: {
    fontSize: 14,
    textAlign: "center",
    color: colors.text,
  },
});
