import {
  ActivityIndicator,
  Button,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { LevelPill } from "@/components/LevelPill";
import { SavedDataBanner } from "@/components/SavedDataBanner";
import { UvGauge } from "@/components/UvGauge";
import { UvHeader } from "@/components/UvHeader";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { useUvIndex, type UvData } from "@/context/UvContext";
import type { strings } from "@/i18n/strings";
import { recommendations, type Rec } from "@/services/recommendations";
import { minutesToBurn, protectionWindow, uvLevel, uvPeak, weatherKind, type WeatherKind } from "@/services/uv";
import { colors, ui } from "@/theme";

type Icon = SymbolViewProps["name"];

const weatherIcons: Record<WeatherKind, Icon> = {
  clear: { ios: "sun.max", android: "sunny" },
  partlyCloudy: { ios: "cloud.sun", android: "partly_cloudy_day" },
  cloudy: { ios: "cloud", android: "cloud" },
  fog: { ios: "cloud.fog", android: "foggy" },
  rain: { ios: "cloud.rain", android: "rainy" },
  snow: { ios: "cloud.snow", android: "weather_snowy" },
  storm: { ios: "cloud.bolt.rain", android: "thunderstorm" },
};
// De noche, un sol no tiene sentido: luna para despejado y parcialmente nublado.
const nightIcons: Partial<Record<WeatherKind, Icon>> = {
  clear: { ios: "moon.stars", android: "bedtime" },
  partlyCloudy: { ios: "cloud.moon", android: "partly_cloudy_night" },
};

export default function Home() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useUvIndex();
  // Primera carga: aún no hay nada que mostrar, así que usamos el indicador grande.
  const firstLoad = loading && data === null && error === null;
  const date = new Date().toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });

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
      <View style={[ui.card, styles.dateBar]}>
        <Text style={styles.date}>
          <Text style={styles.bold}>{t.today.toUpperCase()}</Text> {date}
        </Text>
      </View>

      {firstLoad ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : !data ? (
        error && (
          <View style={ui.card}>
            <Text style={ui.body}>{t.uvErrors[error]}</Text>
            {error === "permission" && (
              <Button title={t.openSettings} color={colors.accent} onPress={() => Linking.openSettings()} />
            )}
          </View>
        )
      ) : (
        <>
          {error && <SavedDataBanner fetchedAt={data.fetchedAt} error={error} />}
          <Conditions data={data} />
        </>
      )}

      {!firstLoad && <Text style={styles.hint}>{t.pullToRefresh}</Text>}
    </ScrollView>
  );
}

function Conditions({ data }: { data: UvData }) {
  const { t } = useLanguage();
  const profile = useProfile().profile;
  const level = uvLevel(data.uv);
  const kind = weatherKind(data.weatherCode);
  const peak = uvPeak(data.day);
  const uvMax = peak.uv;
  const window = protectionWindow(data.day);
  const tomorrow = data.week.find((d) => d.date > data.date);
  // Consejos personalizados: el primero va en la barra azul y el resto en la tarjeta.
  const [mainTip, ...tips] = recommendations({
    now: data.now,
    uv: data.uv,
    level,
    burnNow: profile ? minutesToBurn(data.uv, profile.skin_type) : null,
    peakUv: peak.uv,
    peakTime: peak.time,
    burnPeak: profile ? minutesToBurn(peak.uv, profile.skin_type) : null,
    window,
    tomorrowMax: tomorrow?.uvMax ?? null,
    tomorrowLevel: tomorrow ? uvLevel(tomorrow.uvMax) : null,
    profile,
  }).map((r) => recText(r, t));
  // Solo avisamos de las nubes cuando cambian el nivel de riesgo (si no, sería un dato repetido).
  const clearLevel = uvLevel(data.uvClearSky);
  const cloudsMatter = clearLevel !== level;

  return (
    <>
      <View style={styles.banner}>
        <SymbolView name={{ ios: "exclamationmark.circle", android: "error" }} tintColor="#fff" size={28} />
        <Text style={styles.bannerText}>{mainTip}</Text>
      </View>

      <View
        style={ui.card}
        accessible
        accessibilityLabel={`${t.instantUv} ${Math.round(data.uv)}, ${t.levels[level].name}`}
      >
        <Text style={ui.cardTitle}>{t.instantUv}</Text>
        <UvGauge uv={data.uv} label={t.uvIndex} />
        <View style={styles.center}>
          <LevelPill uv={data.uv} />
        </View>
        <Text style={styles.exact}>
          {t.exactValue}: {data.uv.toFixed(2)}
        </Text>
        {cloudsMatter && (
          <Text style={styles.cloudNote}>
            {t.cloudNote(data.cloudCover, Math.round(data.uvClearSky), t.levels[clearLevel].name)}
          </Text>
        )}
      </View>

      <View style={[ui.card, styles.row]}>
        <View style={styles.iconCircle}>
          <SymbolView name={{ ios: "shield", android: "shield" }} tintColor={colors.accent} size={28} />
        </View>
        <Text style={[ui.cardTitle, styles.rowTitle]}>{t.protectionTitle}</Text>
        <Text style={styles.rowText}>{window ? `${window.from} – ${window.to}` : t.notNeeded}</Text>
      </View>

      <View style={ui.card}>
        <UvHeader uv={uvMax} title={t.uvMaxToday} subtitle={t.peakTime(peak.time)} />
      </View>

      <View style={ui.card}>
        <View style={styles.place}>
          <SymbolView name={{ ios: "location.fill", android: "location_on" }} tintColor={colors.accent} size={20} />
          <Text style={ui.body}>{data.place ?? t.yourLocation}</Text>
        </View>
        {/* Sin internet el clima no se puede prever: se muestra el de la última descarga, con su hora. */}
        {data.weatherTime && <Text style={styles.weatherTime}>{t.weatherAt(data.weatherTime)}</Text>}
        <View style={styles.stats}>
          <Stat icon={(!data.isDay && nightIcons[kind]) || weatherIcons[kind]} value={t.weather[kind]} />
          <Stat
            icon={{ ios: "thermometer.medium", android: "thermostat" }}
            label={t.temperature}
            value={`${Math.round(data.temperature)}°C`}
          />
          <Stat
            icon={{ ios: "drop", android: "water_drop" }}
            label={t.humidity}
            value={`${Math.round(data.humidity)}%`}
          />
        </View>
      </View>

      {tips.length > 0 && (
        <View style={ui.card}>
          <Text style={ui.cardTitle}>{t.recommendations}</Text>
          {tips.map((tip) => (
            <Text key={tip} style={ui.body}>
              • {tip}
            </Text>
          ))}
          <Text style={styles.disclaimer}>{t.recsDisclaimer}</Text>
        </View>
      )}
    </>
  );
}

// Texto de cada consejo en el idioma activo.
function recText(r: Rec, t: (typeof strings)["es"]): string {
  const s = t.recs;
  switch (r.id) {
    case "lowAllDay":
    case "lowDone":
    case "periodAllDay":
    case "nothing":
      return s[r.id];
    case "lowLater":
    case "window":
      return s[r.id](r.from, r.to);
    case "burnNow":
      return s.burnNow(t.duration(r.minutes), r.uv, t.levels[r.level].name);
    case "periodMidday":
      return s.periodMidday(r.uv, r.time);
    case "periodMorning":
      return s.periodMorning(r.from);
    case "periodAfternoon":
      return s.periodAfternoon(r.to);
    case "exposure":
      return s.exposure(s.sunTimes[r.sunTime], t.duration(r.minutes));
    case "missing":
      return s.missing[r.item];
    case "occupation":
      return s.occupation[r.occupation];
    case "age":
      return s.age[r.age];
    case "tomorrow":
      return s.tomorrow(r.uv, t.levels[r.level].name);
  }
}

function Stat({ icon, label, value }: { icon: Icon; label?: string; value: string }) {
  return (
    <View style={styles.stat}>
      <SymbolView name={icon} tintColor={colors.accent} size={30} />
      {label && <Text style={styles.statLabel}>{label.toUpperCase()}</Text>}
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dateBar: {
    alignItems: "center",
    paddingVertical: 12,
  },
  date: {
    color: colors.text,
    fontSize: 14,
  },
  bold: {
    fontWeight: "bold",
  },
  loader: {
    marginVertical: 48,
  },
  banner: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bannerText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rowTitle: {
    flex: 1,
  },
  // Mismo tamaño que el círculo del UV, para que los textos de las tarjetas queden alineados.
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
  },
  rowText: {
    fontSize: 16,
    color: colors.text,
  },
  center: {
    alignItems: "center",
  },
  cloudNote: {
    color: colors.text,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  exact: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 13,
  },
  place: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  stats: {
    flexDirection: "row",
  },
  weatherTime: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  statValue: {
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
  },
  disclaimer: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    color: colors.muted,
    textAlign: "center",
  },
});
