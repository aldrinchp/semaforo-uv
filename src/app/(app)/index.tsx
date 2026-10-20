import { ActivityIndicator, Button, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { UvCard } from "@/components/UvCard";
import { useLanguage } from "@/context/LanguageContext";
import { useUvIndex } from "@/hooks/useUvIndex";

const ACCENT = "#f57c00";

export default function Home() {
  const { t } = useLanguage();
  const { uv, loading, error, refresh } = useUvIndex();
  // Primera carga: aún no hay nada que mostrar, así que usamos el indicador grande.
  const firstLoad = loading && uv === null && error === null;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading && !firstLoad}
          onRefresh={refresh}
          colors={[ACCENT]}
          tintColor={ACCENT}
        />
      }
    >
      {firstLoad ? (
        <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
      ) : error ? (
        <View style={styles.box}>
          <Text style={styles.errorText}>{t.uvErrors[error]}</Text>
          {error === "permission" && (
            <Button title={t.openSettings} color={ACCENT} onPress={() => Linking.openSettings()} />
          )}
        </View>
      ) : (
        uv !== null && <UvCard uv={uv} />
      )}

      {!firstLoad && <Text style={styles.hint}>{t.pullToRefresh}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    gap: 16,
  },
  loader: {
    marginVertical: 48,
  },
  box: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    lineHeight: 22,
  },
  hint: {
    color: "#888",
    textAlign: "center",
  },
});
