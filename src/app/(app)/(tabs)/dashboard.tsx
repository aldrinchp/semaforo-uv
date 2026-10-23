import { useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SavedDataBanner } from "@/components/SavedDataBanner";
import { Segmented } from "@/components/Segmented";
import { ClearSkySwitch, UvDayChart } from "@/components/UvDayChart";
import { UvHeader } from "@/components/UvHeader";
import { formatRange, UvWeekChart } from "@/components/UvWeekChart";
import { useLanguage } from "@/context/LanguageContext";
import { useUvIndex, type UvData } from "@/context/UvContext";
import { PAST_DAYS, protectionWindow, uvLevel, uvPeak, type UvDay } from "@/services/uv";
import { colors, ui } from "@/theme";

type Period = "past" | "today" | "next";

// Dashboard: un selector arriba y solo una vista a la vez (por defecto, Hoy), para no saturar.
export default function Dashboard() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useUvIndex();
  const [period, setPeriod] = useState<Period>("today");
  // Un solo interruptor "UV sin nubes" para las tres vistas: si se enciende en una, sigue en las otras.
  const [showClearSky, setShowClearSky] = useState(false);
  const clearSky = { showClearSky, onShowClearSkyChange: setShowClearSky };
  const firstLoad = loading && data === null && error === null;

  // Bajo "Hoy" va la fecha corta ("mié 21 oct"): es el día del lugar (sin internet, el que toca
  // según la hora del celular).
  const todayDate =
    data && new Date(`${data.date}T12:00`).toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });
  const options: { value: Period; label: string; detail?: string | null }[] = [
    { value: "past", label: t.viewPast },
    { value: "today", label: t.today, detail: todayDate },
    { value: "next", label: t.viewNext },
  ];

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={ui.content}
      refreshControl={
        <RefreshControl
          refreshing={loading && !firstLoad}
          onRefresh={refresh}
          colors={[colors.accent]}
          tintColor={colors.accent}
        />
      }
    >
      <Segmented options={options} value={period} onChange={setPeriod} />

      {firstLoad ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : !data ? (
        error && (
          <View style={ui.card}>
            <Text style={ui.body}>{t.uvErrors[error]}</Text>
          </View>
        )
      ) : (
        <>
          {error && <SavedDataBanner fetchedAt={data.fetchedAt} error={error} />}
          {period === "today" ? (
            <TodayView data={data} {...clearSky} />
          ) : period === "past" ? (
            // Por fecha y no por posición: si pasan días sin internet, "hoy" ya no está en el centro.
            <WeekView
              days={data.week.filter((d) => d.date < data.date).slice(-PAST_DAYS)}
              title={t.pastTitle}
              note={t.weekNote}
              {...clearSky}
            />
          ) : (
            <WeekView
              days={data.week.filter((d) => d.date > data.date).slice(0, PAST_DAYS)}
              title={t.nextTitle}
              note={t.nextNote}
              {...clearSky}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

type ClearSkyProps = { showClearSky: boolean; onShowClearSkyChange: (value: boolean) => void };

function TodayView({ data, showClearSky, onShowClearSkyChange }: { data: UvData } & ClearSkyProps) {
  const { t } = useLanguage();
  const window = protectionWindow(data.day);
  const peak = uvPeak(data.day);

  return (
    <>
      <View style={ui.card}>
        <Text style={ui.cardTitle}>{t.uvToday}</Text>
        <UvDayChart day={data.day} now={data.now} showClearSky={showClearSky} />
        <ClearSkySwitch value={showClearSky} onChange={onShowClearSkyChange} />
      </View>

      <View style={ui.card}>
        <UvHeader uv={peak.uv} title={t.peak} subtitle={t.peakTime(peak.time)} />
        <Row label={t.protectionTitle} value={window ? `${window.from} – ${window.to}` : t.notNeeded} />
      </View>
    </>
  );
}

// 7 días (pasados o próximos): rango de fechas, gráfica con los días de más UV resaltados y una nota.
function WeekView({
  days,
  title,
  note,
  showClearSky,
  onShowClearSkyChange,
}: { days: UvDay[]; title: string; note: string } & ClearSkyProps) {
  const { t, lang } = useLanguage();
  // Sin internet varios días, los "próximos" guardados se acaban.
  if (!days.length) {
    return (
      <View style={ui.card}>
        <Text style={ui.cardTitle}>{title}</Text>
        <Text style={ui.body}>{t.noDaysSaved}</Text>
      </View>
    );
  }
  // Se compara el índice redondeado (el que ve el usuario): varios días pueden empatar.
  const top = Math.max(...days.map((d) => Math.round(d.uvMax)));
  const best = days.filter((d) => Math.round(d.uvMax) === top).map((d) => d.date);
  const allSame = days.length > 1 && best.length === days.length; // resaltar todos no diría nada
  const level = t.levels[uvLevel(top)].name;

  return (
    <View style={ui.card}>
      <View>
        <Text style={ui.cardTitle}>{title}</Text>
        <Text style={styles.subtitle}>{formatRange(days[0].date, days[days.length - 1].date, lang)}</Text>
      </View>
      <UvWeekChart days={days} best={allSame ? [] : best} lang={lang} showClearSky={showClearSky} />
      {showClearSky && (
        <View style={styles.legendRow}>
          <View style={styles.grayKey} />
          <Text style={styles.legend}>{t.legendClearSkyMax}</Text>
        </View>
      )}
      <ClearSkySwitch value={showClearSky} onChange={onShowClearSkyChange} />
      <Text style={ui.body}>{allSame ? t.sameAllWeek(days.length, top, level) : t.bestLegend(best.length, top, level)}</Text>
      <Text style={styles.legend}>{note}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={ui.cardTitle}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginVertical: 48,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  grayKey: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  legend: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  value: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 16,
    color: colors.text,
  },
});
