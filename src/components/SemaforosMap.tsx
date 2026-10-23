import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { BurnTime, DeviceHeader, ReadingStatus } from "@/components/DeviceStatus";
import { useLanguage } from "@/context/LanguageContext";
import { deviceNow, type Device, type Live, type Reading } from "@/services/devices";
import { uvLevel, uvScale } from "@/services/uv";
import { colors, ui } from "@/theme";

export type MapItem = { device: Device; reading: Reading | null; distance: number | null };
type Coords = { latitude: number; longitude: number };

// El mapa es una pequeña página web con Leaflet y los mapas de OpenStreetMap: no necesita claves ni
// cuentas, ni en Expo Go ni en la app instalada. La app le pasa los semáforos con setData(); la página
// avisa con postMessage cuando se toca un semáforo o el mapa.
// ponytail: los servidores de OpenStreetMap son de voluntarios y solo admiten uso ligero; si la app
// crece, cambiar la URL de las teselas por un proveedor (MapTiler, Stadia...) con su clave.
const MAP_HTML = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; }
  .uv { width: 36px; height: 36px; border-radius: 18px; border: 2px solid #fff; box-sizing: border-box;
        display: flex; align-items: center; justify-content: center; font: bold 15px sans-serif;
        box-shadow: 0 1px 4px rgba(0, 0, 0, .4); }
  .uv.sel { border: 3px solid #222; }
</style>
</head><body><div id="map"></div><script>
  var map = L.map("map", { zoomControl: false }).setView([0.4186, -78.1966], 13); // Urcuquí
  map.attributionControl.setPosition("topright"); // abajo va el resumen del semáforo
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  var layer = L.layerGroup().addTo(map), me = null, framed = false;
  function send(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  map.on("click", function () { send({ type: "deselect" }); });
  window.centerMe = function () { if (me) map.setView(me.getLatLng(), 15); };
  // Centra un punto en la parte del mapa que queda libre encima de la tarjeta de abajo (bottom = su alto).
  var cardHeight = 0; // la última medida: sirve para volver a centrar el semáforo que ya estaba elegido
  window.focusOn = function (lat, lon, bottom) {
    cardHeight = bottom;
    var z = map.getZoom();
    map.panTo(map.unproject(map.project([lat, lon], z).add([0, bottom / 2]), z));
  };
  window.setData = function (d) {
    layer.clearLayers();
    d.markers.forEach(function (m) {
      var icon = L.divIcon({ className: "", iconSize: [36, 36], iconAnchor: [18, 18],
        html: '<div class="uv' + (m.selected ? " sel" : "") + '" style="background:' + m.bg + ";color:" + m.fg + '">' + m.label + "</div>" });
      L.marker([m.lat, m.lon], { icon: icon, keyboard: false })
        .on("click", function () {
          // Si ya estaba elegido, su tarjeta no cambia (no se vuelve a medir): se centra desde aquí.
          if (m.selected) window.focusOn(m.lat, m.lon, cardHeight);
          send({ type: "select", id: m.id });
        })
        .addTo(layer);
    });
    if (d.me) {
      if (me) me.setLatLng(d.me);
      else me = L.circleMarker(d.me, { radius: 7, color: "#fff", weight: 2, fillColor: "#1a73e8", fillOpacity: 1 }).addTo(map);
    }
    if (!framed && (d.me || d.markers.length)) { // el encuadre, solo la primera vez: después manda el usuario
      framed = true;
      var near = d.markers[0];
      if (d.me && near) map.fitBounds([d.me, [near.lat, near.lon]], { padding: [60, 60], maxZoom: 15 });
      else map.setView(d.me || [near.lat, near.lon], 14);
    }
  };
  send({ type: "ready" });
</script></body></html>`;

// Mapa de semáforos: cada uno es un círculo con el color de su nivel y su UV dentro (gris si está
// sin conexión). Al tocarlo, abajo aparece su resumen con un botón al detalle.
export function SemaforosMap({
  items,
  live,
  now,
  position,
}: {
  items: MapItem[];
  live: Record<string, Live>;
  now: number;
  position: Coords | null;
}) {
  const { t } = useLanguage();
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.device.id === selectedId);

  // Los semáforos van ordenados del más cercano al más lejano: el primero es el que se encuadra.
  const markers = items.flatMap(({ device, reading }) => {
    if (device.latitude == null || device.longitude == null) return [];
    const state = deviceNow(reading, live[device.id], now);
    const level = state.uv !== null && state.online ? uvLevel(state.uv) : null;
    return [
      {
        id: device.id,
        lat: device.latitude,
        lon: device.longitude,
        label: state.uv !== null ? String(Math.round(state.uv)) : "–",
        bg: level ? uvScale[level].background : colors.muted,
        fg: level ? uvScale[level].text : "#fff",
        selected: device.id === selectedId,
      },
    ];
  });
  const data = JSON.stringify({ markers, me: position ? [position.latitude, position.longitude] : null });

  // Cada vez que cambian los datos (o el semáforo elegido), se redibujan los círculos.
  useEffect(() => {
    if (ready) web.current?.injectJavaScript(`window.setData(${data}); true;`);
  }, [ready, data]);

  function onMessage(e: WebViewMessageEvent) {
    const msg = JSON.parse(e.nativeEvent.data);
    if (msg.type === "ready") setReady(true);
    else if (msg.type === "deselect") setSelectedId(null);
    else if (msg.type === "select" && items.some((i) => i.device.id === msg.id)) setSelectedId(msg.id);
  }

  return (
    <View style={styles.wrapper}>
      <WebView
        ref={web}
        style={styles.map}
        originWhitelist={["*"]}
        // OpenStreetMap bloquea las teselas pedidas sin "Referer" (desde dónde se piden). Con baseUrl la
        // página tiene una dirección de origen: la de nuestro proyecto de Supabase.
        source={{ html: MAP_HTML, baseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL }}
        onMessage={onMessage}
      />

      {position && (
        <Pressable
          onPress={() => web.current?.injectJavaScript("window.centerMe(); true;")}
          style={styles.meButton}
          accessibilityRole="button"
          accessibilityLabel={t.myLocation}
          hitSlop={8}
        >
          <SymbolView name={{ ios: "location.fill", android: "my_location" }} tintColor={colors.accent} size={22} />
        </Pressable>
      )}

      {selected ? (
        <SelectedCard
          key={selected.device.id} // una tarjeta nueva por semáforo: así se mide (y se centra) cada vez
          item={selected}
          live={live[selected.device.id]}
          now={now}
          onLayout={(e) => {
            // Ya se sabe cuánto mide la tarjeta: el semáforo se centra en el espacio que queda encima.
            const bottom = e.nativeEvent.layout.height + 24; // tarjeta + su margen de abajo + aire
            const { latitude, longitude } = selected.device;
            web.current?.injectJavaScript(`window.focusOn(${latitude}, ${longitude}, ${bottom}); true;`);
          }}
        />
      ) : (
        <View style={[styles.overlay, styles.hint]}>
          <Text style={styles.hintText}>{t.mapHint}</Text>
        </View>
      )}
    </View>
  );
}

function SelectedCard({
  item,
  live,
  now,
  onLayout,
}: {
  item: MapItem;
  live: Live | undefined;
  now: number;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const { t } = useLanguage();
  const { device, reading, distance } = item;
  const state = deviceNow(reading, live, now);
  return (
    <View style={[ui.card, styles.overlay]} onLayout={onLayout}>
      <DeviceHeader device={device} state={state} distance={distance} />
      {state.uv !== null && state.online && <BurnTime uv={state.uv} />}
      <ReadingStatus state={state} now={now} />
      <Pressable
        onPress={() => router.push({ pathname: "/semaforo/[id]", params: { id: device.id } })}
        style={styles.button}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{t.seeDetail} ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    marginTop: 12,
  },
  map: {
    flex: 1,
  },
  meButton: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },
  hint: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 10,
  },
  hintText: {
    color: colors.text,
    textAlign: "center",
    fontSize: 13,
  },
  button: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
