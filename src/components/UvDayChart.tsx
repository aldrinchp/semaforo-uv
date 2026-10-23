import { useEffect, useRef, useState } from "react";
import { StyleSheet, Switch, Text, View, type GestureResponderEvent } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { useLanguage } from "@/context/LanguageContext";
import { uvLevel, uvScale, type UvPoint } from "@/services/uv";
import { colors } from "@/theme";

const PLOT_HEIGHT = 150;
const TOP = 22; // espacio para la etiqueta "Ahora"
const AXIS = 36; // franja de las horas y el título "Hora", debajo de la curva
const LEFT = 22; // columna de los valores 0, 3, 6, 8, 11
const RIGHT = 6;
const HIDE_AFTER_MS = 3000; // al soltar el dedo, la selección se borra sola tras 3 s

// Valores del eje vertical: donde empieza cada nivel de la OMS. Las líneas guía van en .5 porque el
// nivel se decide con el índice redondeado (2.4 -> 2 "Bajo", 2.5 -> 3 "Moderado").
const GRID: { from: number; label: string }[] = [
  { from: 0, label: "0" },
  { from: 2.5, label: "3" },
  { from: 5.5, label: "6" },
  { from: 7.5, label: "8" },
  { from: 10.5, label: "11" },
];

// "11:15" + 15 min -> "11:30"
function blockEnd(time: string) {
  const m = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + 15;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

const hasValue = (v: number) => !Number.isNaN(v);

// UV de un día: una barra por cada bloque de 15 min (solo en las horas con sol), con el color de su
// nivel OMS. Sirve para el pronóstico y para lo medido por un semáforo; en lo medido, un bloque sin
// lecturas (semáforo sin conexión) llega con uv = NaN y se deja vacío.
// Opcional (`showClearSky`): detrás de cada barra, en gris, el UV sin nubes. Al tocar o deslizar el
// dedo se ve la hora y el UV de ese momento.
export function UvDayChart({
  day,
  now,
  showClearSky,
  legend,
}: {
  day: UvPoint[];
  now: string;
  showClearSky: boolean;
  legend?: string; // texto de la leyenda de las barras (por defecto, "UV previsto")
}) {
  const { t } = useLanguage();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hideTimer.current), []); // al salir de la pantalla

  const first = day.findIndex((p) => p.clearSky > 0 || p.uv > 0);
  const last = day.findLastIndex((p) => p.clearSky > 0 || p.uv > 0);
  if (first === -1 || last === first) return null;

  const points = day.slice(first, last + 1);
  const values = points.flatMap((p) => [p.uv, p.clearSky]).filter(hasValue);
  const yMax = Math.max(12, Math.ceil(Math.max(...values)) + 1);
  const plotWidth = Math.max(width - LEFT - RIGHT, 0);
  const slot = plotWidth / points.length; // ancho que le toca a cada barra
  const barWidth = Math.max(slot - 1, 1); // 1 px de separación entre barras
  const x = (i: number) => LEFT + (i + 0.5) * slot; // centro de la barra i
  const y = (v: number) => TOP + PLOT_HEIGHT - (Math.min(v, yMax) / yMax) * PLOT_HEIGHT;
  const bar = (i: number, v: number) => ({ x: x(i) - barWidth / 2, y: y(v), width: barWidth, height: y(0) - y(v) });

  const nowIndex = points.findIndex((p) => p.time === now);
  // Cada hora en punto lleva una marquita en el eje; las horas pares, además, su número ("06", "08"...).
  // Con número en todas no caben bien en un celular (~23 px por hora).
  const ticks = points
    .map((p, i) => ({ i, hour: p.time.slice(0, 2), labeled: Number(p.time.slice(0, 2)) % 2 === 0 }))
    .filter(({ i }) => points[i].time.endsWith(":00"));

  // El dedo no tiene que acertar a la curva: se elige el bloque más cercano en horizontal.
  function select(e: GestureResponderEvent) {
    clearTimeout(hideTimer.current); // mientras toca, la selección se mantiene
    if (!plotWidth) return;
    const i = Math.floor((e.nativeEvent.locationX - LEFT) / slot);
    setSelected(Math.min(Math.max(i, 0), points.length - 1));
  }

  function hideSoon() {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setSelected(null), HIDE_AFTER_MS);
  }

  const p = selected === null ? null : points[selected];
  const info = !p
    ? t.chartHint
    : hasValue(p.uv)
      ? `${p.time}–${blockEnd(p.time)} · UV ${Math.round(p.uv)} (${t.levels[uvLevel(p.uv)].name})`
      : `${p.time}–${blockEnd(p.time)} · ${t.noData}`;
  const detail =
    p && hasValue(p.uv)
      ? `${t.exactValue}: ${p.uv.toFixed(1)}` + (showClearSky ? ` · ${t.noClouds}: ${p.clearSky.toFixed(1)}` : "")
      : null;

  return (
    <View style={styles.wrapper}>
      {/* Información del momento elegido (o una pista si no se eligió ninguno). */}
      <View style={styles.info}>
        <Text style={[styles.infoText, p && styles.infoSelected]}>{info}</Text>
        {detail && <Text style={styles.infoDetail}>{detail}</Text>}
      </View>

      <View
        style={styles.chart}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        // box-only: el toque lo recibe la gráfica entera, así la posición del dedo se mide siempre
        // desde su borde izquierdo.
        pointerEvents="box-only"
        onStartShouldSetResponder={() => true}
        onResponderGrant={select}
        onResponderMove={select}
        // Al soltar (o si la pantalla se desplaza), la gráfica vuelve a la normalidad tras unos segundos.
        onResponderRelease={hideSoon}
        onResponderTerminate={hideSoon}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t.uvToday}
        accessibilityValue={{ text: detail ? `${info}. ${detail}` : info }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          const from = selected ?? Math.max(nowIndex, 0);
          const step = e.nativeEvent.actionName === "increment" ? 1 : -1;
          setSelected(Math.min(Math.max(from + step, 0), points.length - 1));
        }}
      >
        {width > 0 && (
          <Svg width={width} height={TOP + PLOT_HEIGHT + AXIS}>
            {/* Líneas guía (suaves) donde empieza cada nivel, con su valor a la izquierda. */}
            {GRID.map((g) => (
              <Line
                key={`grid${g.label}`}
                x1={LEFT}
                x2={LEFT + plotWidth}
                y1={y(g.from)}
                y2={y(g.from)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            {GRID.map((b) => (
              <SvgText
                key={b.label}
                x={LEFT - 6}
                y={y(b.from) + 4}
                fontSize={11}
                fill={colors.muted}
                textAnchor="end"
              >
                {b.label}
              </SvgText>
            ))}
            <Line x1={LEFT} x2={LEFT + plotWidth} y1={y(0)} y2={y(0)} stroke={colors.border} strokeWidth={1} />
            {/* Títulos de los ejes: vertical = índice UV, horizontal = hora del día. */}
            <SvgText x={LEFT - 6} y={TOP - 7} fontSize={11} fontWeight="bold" fill={colors.muted} textAnchor="end">
              UV
            </SvgText>
            <SvgText
              x={LEFT + plotWidth / 2}
              y={TOP + PLOT_HEIGHT + 32}
              fontSize={11}
              fontWeight="bold"
              fill={colors.muted}
              textAnchor="middle"
            >
              {t.axisTime}
            </SvgText>
            {ticks.map(({ i, hour, labeled }) => (
              <Line key={`tick${hour}`} x1={x(i)} x2={x(i)} y1={y(0)} y2={y(0) + 4} stroke={colors.muted} strokeWidth={1} />
            ))}
            {ticks
              .filter(({ labeled }) => labeled)
              .map(({ i, hour }) => (
                <SvgText
                  key={hour}
                  x={Math.min(Math.max(x(i), LEFT + 8), width - 10)}
                  y={TOP + PLOT_HEIGHT + 16}
                  fontSize={11}
                  fill={colors.muted}
                  textAnchor="middle"
                >
                  {hour}
                </SvgText>
              ))}

            {/* UV sin nubes (opcional): barra gris detrás de cada barra de color. */}
            {showClearSky &&
              points.map(
                (pt, i) =>
                  hasValue(pt.clearSky) && (
                    <Rect key={`cs${pt.time}`} {...bar(i, Math.max(pt.clearSky, pt.uv))} fill={colors.border} />
                  ),
              )}
            {/* Una barra por bloque de 15 min, con el color de su nivel OMS. */}
            {points.map(
              (pt, i) =>
                hasValue(pt.uv) && (
                  <Rect key={pt.time} {...bar(i, pt.uv)} rx={1} fill={uvScale[uvLevel(pt.uv)].background} />
                ),
            )}

            {nowIndex !== -1 && (
              <>
                <Line x1={x(nowIndex)} x2={x(nowIndex)} y1={TOP} y2={y(0)} stroke={colors.text} strokeWidth={1} />
                <SvgText
                  x={Math.min(Math.max(x(nowIndex), LEFT + 18), width - 22)}
                  y={TOP - 7}
                  fontSize={12}
                  fontWeight="bold"
                  fill={colors.text}
                  textAnchor="middle"
                >
                  {t.now}
                </SvgText>
              </>
            )}
            {p && selected !== null && (
              <>
                <Line x1={x(selected)} x2={x(selected)} y1={TOP} y2={y(0)} stroke={colors.accent} strokeWidth={1} />
                {/* La barra elegida, con un borde oscuro. */}
                {hasValue(p.uv) && (
                  <Rect {...bar(selected, p.uv)} fill="none" stroke={colors.text} strokeWidth={1.5} />
                )}
              </>
            )}
          </Svg>
        )}
      </View>

      {/* Leyenda debajo de la gráfica: la curva siempre; la línea sin nubes, solo si está encendida. */}
      <View style={styles.legend}>
        <LegendRow gray={false} label={legend ?? t.legendForecast} />
        {showClearSky && <LegendRow gray label={t.legendClearSky} />}
      </View>
    </View>
  );
}

// Interruptor "Mostrar UV sin nubes". Lo comparten las gráficas del Dashboard.
export function ClearSkySwitch({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const { t } = useLanguage();
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleText}>{t.showClearSky}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent }}
        accessibilityLabel={t.showClearSky}
      />
    </View>
  );
}

function LegendRow({ gray, label }: { gray: boolean; label: string }) {
  return (
    <View style={styles.legendRow}>
      <Svg width={22} height={10} style={styles.legendKey}>
        {/* La clave imita la marca: barras de colores para el UV, una gris para "sin nubes". */}
        {gray ? (
          <Rect x={1} y={0} width={20} height={10} rx={1} fill={colors.border} />
        ) : (
          (["low", "moderate", "veryHigh"] as const).map((l, i) => (
            <Rect key={l} x={1 + i * 7} y={0} width={6} height={10} rx={1} fill={uvScale[l].background} />
          ))
        )}
      </Svg>
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

// Barra de color (UV con nubes) sobre fondo gris (UV sin nubes), a escala de `max`. Para ocultar
// el gris, pasar clearSky igual a uv. La usan las gráficas de los últimos y próximos 7 días.
export function UvBar({ uv, clearSky, max, height }: { uv: number; clearSky: number; max: number; height: number }) {
  return (
    <View style={[styles.clearSky, { height: (Math.max(uv, clearSky) / max) * height }]}>
      <View style={{ height: (uv / max) * height, backgroundColor: uvScale[uvLevel(uv)].background }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  info: {
    minHeight: 40, // misma altura con y sin momento elegido: la gráfica no salta
    justifyContent: "center",
  },
  infoText: {
    fontSize: 13,
    color: colors.muted,
  },
  infoSelected: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.text,
  },
  infoDetail: {
    fontSize: 12,
    color: colors.muted,
  },
  chart: {
    height: TOP + PLOT_HEIGHT + AXIS, // incluye la franja de las horas
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  legend: {
    gap: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  legendKey: {
    marginTop: 4,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  clearSky: {
    backgroundColor: colors.border,
    justifyContent: "flex-end",
  },
});
