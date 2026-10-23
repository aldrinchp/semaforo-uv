import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { BurnTime, ReadingStatus } from "@/components/DeviceStatus";
import { LevelPill } from "@/components/LevelPill";
import { UvDayChart } from "@/components/UvDayChart";
import { UvGauge } from "@/components/UvGauge";
import { UvWeekChart } from "@/components/UvWeekChart";
import { useLanguage } from "@/context/LanguageContext";
import { useLiveValues } from "@/hooks/useLiveValues";
import {
  deviceNow,
  fetchDevice,
  fetchDailyMax,
  fetchLatestReadings,
  fetchReadingsBetween,
  readingsToBlocks,
  type DayMax,
  type Device,
  type Reading,
} from "@/services/devices";
import { uvLevel, uvScale, type UvLevel } from "@/services/uv";
import { colors, shadow, ui } from "@/theme";

// `day`: las lecturas del día elegido (0 = hoy, -1 = ayer...); `week`: el máximo de los últimos 7 días.
type Detail = { device: Device; latest: Reading | null; day: Reading[]; week: DayMax[] };

const HISTORY_DAYS = 7;
const pad = (n: number) => String(n).padStart(2, "0");

// Medianoche (hora local del teléfono) del día `offset` contando desde hoy.
function midnight(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function loadDetail(id: string, offset: number): Promise<Detail> {
  const [device, latest, day, week] = await Promise.all([
    fetchDevice(id),
    fetchLatestReadings([id]),
    fetchReadingsBetween(id, midnight(offset), midnight(offset + 1)),
    fetchDailyMax(id, HISTORY_DAYS),
  ]);
  return { device, latest: latest[id], day, week };
}

// Detalle de un semáforo: su UV medido ahora (medidor) y el tiempo hasta quemarse; el resumen de los
// últimos 7 días; y del día elegido (por defecto hoy), la gráfica con lo que midió y cuánto tiempo
// estuvo en cada nivel. Se actualiza sola cada minuto mientras está a la vista.
export default function SemaforoDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useLanguage();
  const [offset, setOffset] = useState(0); // día elegido: 0 = hoy, -1 = ayer...
  const [detail, setDetail] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const live = useLiveValues();

  const load = useCallback(() => {
    loadDetail(id, offset)
      .then((d) => {
        setDetail(d);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => {
        setRefreshing(false);
        setNow(Date.now());
      });
  }, [id, offset]);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, 60 * 1000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const date = new Date(now);
  const nowBlock = `${pad(date.getHours())}:${pad(Math.floor(date.getMinutes() / 15) * 15)}`;
  const state = deviceNow(detail?.latest ?? null, live[id], now);
  const blocks = readingsToBlocks(detail?.day ?? []);
  const hasSun = blocks.some((b) => b.uv > 0);
  const selectedDay = midnight(offset);
  const selectedLabel = selectedDay.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });

  return (
    <>
      <Stack.Screen options={{ title: detail?.device.name ?? t.semaphores }} />
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
        {failed && (
          <View style={ui.card}>
            <Text style={ui.body}>{t.semaphoresError}</Text>
          </View>
        )}
        {!detail ? (
          !failed && <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
        ) : (
          <>
            {/* Medidor con el UV en vivo (o el del último minuto), igual que el "UV actual" del pronóstico. */}
            <View style={[ui.card, !state.online && styles.offline]}>
              <Text style={ui.cardTitle}>{t.measuredUv}</Text>
              {detail.device.place && <Text style={styles.muted}>{detail.device.place}</Text>}
              {state.uv !== null && (
                <>
                  <UvGauge uv={state.uv} label={t.uvIndex} />
                  <View style={styles.center}>
                    <LevelPill uv={state.uv} />
                  </View>
                  {state.online && <BurnTime uv={state.uv} />}
                </>
              )}
              <ReadingStatus state={state} now={now} />
            </View>

            <WeekHistory week={detail.week} selected={dayKey(selectedDay)} onSelect={setOffset} />

            {/* Elegir el día: ‹ anterior · fecha · siguiente › (hasta 7 días atrás). */}
            <View style={styles.dayNav}>
              <DayArrow
                icon={{ ios: "chevron.left", android: "chevron_left" }}
                label={t.previousDay}
                disabled={offset <= 1 - HISTORY_DAYS}
                onPress={() => setOffset(offset - 1)}
              />
              <Text style={styles.dayLabel}>{offset === 0 ? `${t.today} · ${selectedLabel}` : selectedLabel}</Text>
              <DayArrow
                icon={{ ios: "chevron.right", android: "chevron_right" }}
                label={t.nextDay}
                disabled={offset >= 0}
                onPress={() => setOffset(offset + 1)}
              />
            </View>

            <View style={ui.card}>
              <Text style={ui.cardTitle}>{offset === 0 ? t.collectedToday : t.collectedOn(selectedLabel)}</Text>
              {/* Sin lecturas con sol (p. ej. hoy de madrugada) no hay nada que graficar. */}
              {hasSun ? (
                <>
                  <UvDayChart
                    day={blocks}
                    now={offset === 0 ? nowBlock : ""}
                    showClearSky={false}
                    legend={t.legendMeasured}
                  />
                  <TimePerLevel readings={detail.day} />
                </>
              ) : (
                <Text style={ui.body}>{offset === 0 ? t.noSunToday : t.noSunThatDay}</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

// Cuánto tiempo estuvo el UV en cada nivel (con su color, como las barras) y el máximo medido.
function TimePerLevel({ readings }: { readings: Reading[] }) {
  const { t } = useLanguage();
  // Minutos en cada nivel: cada lectura es un minuto. Solo cuentan las de día (UV > 0), para que la
  // noche no aparezca como horas "en verde".
  const minutes: Partial<Record<UvLevel, number>> = {};
  for (const r of readings) {
    if (r.uv_avg > 0) minutes[uvLevel(r.uv_avg)] = (minutes[uvLevel(r.uv_avg)] ?? 0) + 1;
  }
  const max = readings.reduce((a, b) => (b.uv_max > a.uv_max ? b : a));
  const maxDate = new Date(Date.parse(max.measured_at));
  const maxTime = `${pad(maxDate.getHours())}:${pad(maxDate.getMinutes())}`;
  const levels = (["extreme", "veryHigh", "high", "moderate", "low"] as const).filter((l) => minutes[l]);

  return (
    <View style={styles.levels}>
      <Text style={styles.subtitle}>{t.timePerLevel}</Text>
      {levels.map((l) => (
        <View key={l} style={styles.levelRow}>
          <View style={[styles.swatch, { backgroundColor: uvScale[l].background }]} />
          <Text style={ui.body}>
            {t.levels[l].name}: {t.duration(minutes[l] ?? 0)}
          </Text>
        </View>
      ))}
      <Text style={[ui.body, styles.max]}>
        {t.maxMeasured(Math.round(max.uv_max), t.levels[uvLevel(max.uv_max)].name, maxTime)}
      </Text>
    </View>
  );
}

// Resumen de los últimos 7 días: barras con el UV máximo medido cada día ("–" si no hubo lecturas).
// Tocar un día lo abre más abajo.
function WeekHistory({
  week,
  selected,
  onSelect,
}: {
  week: DayMax[];
  selected: string;
  onSelect: (offset: number) => void;
}) {
  const { t, lang } = useLanguage();
  const byDay = new Map(week.map((d) => [d.day, d.uv_max]));
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const offset = i - (HISTORY_DAYS - 1);
    const uv = byDay.get(dayKey(midnight(offset))) ?? NaN;
    return { date: dayKey(midnight(offset)), uvMax: uv, clearSkyMax: uv, offset };
  });
  const withData = days.filter((d) => !Number.isNaN(d.uvMax));
  const highest = withData.reduce<(typeof days)[number] | null>((a, b) => (!a || b.uvMax > a.uvMax ? b : a), null);

  return (
    <View style={ui.card}>
      <Text style={ui.cardTitle}>{t.history7}</Text>
      {withData.length === 0 ? (
        <Text style={ui.body}>{t.noDataWeek}</Text>
      ) : (
        <>
          <UvWeekChart
            days={days}
            best={[]}
            lang={lang}
            showClearSky={false}
            selected={selected}
            onPressDay={(date) => onSelect(days.find((d) => d.date === date)!.offset)}
          />
          <Text style={ui.body}>{t.redDays(withData.filter((d) => d.uvMax >= 7.5).length, withData.length)}</Text>
          {highest && (
            <Text style={ui.body}>
              {t.highestOn(
                Math.round(highest.uvMax),
                new Date(`${highest.date}T12:00`).toLocaleDateString(lang, { weekday: "long", day: "numeric" }),
              )}
            </Text>
          )}
          <Text style={styles.muted}>{t.historyHint}</Text>
        </>
      )}
    </View>
  );
}

function DayArrow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: { ios: "chevron.left" | "chevron.right"; android: "chevron_left" | "chevron_right" };
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={[styles.arrow, disabled && styles.arrowDisabled]}
    >
      <SymbolView name={icon} tintColor={colors.accent} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginVertical: 48,
  },
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    ...shadow,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  offline: {
    opacity: 0.6,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  center: {
    alignItems: "center",
  },
  levels: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  max: {
    marginTop: 4,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
