import { StyleSheet, Text, View } from "react-native";
import { uvLevel, uvScale } from "@/services/uv";
import { colors } from "@/theme";

const SIZE = 220;
const RADIUS = 92;
const SEGMENTS = 11; // un segmento por punto del índice; el último representa "11+"
const SEG_W = 32;
const SEG_H = 14;
const START = 135; // grados en sentido horario desde las 3 en punto: empieza abajo a la izquierda
const SWEEP = 270; // deja un hueco abajo, como un velocímetro

// Arco segmentado hecho con Views (sin librerías de gráficos): se pintan tantos segmentos
// como el índice UV, cada uno con el color OMS de su nivel; el resto queda gris.
export function UvGauge({ uv, label }: { uv: number; label: string }) {
  const index = Math.round(uv);
  return (
    <View style={styles.gauge}>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const angle = START + (i + 0.5) * (SWEEP / SEGMENTS);
        const rad = (angle * Math.PI) / 180;
        return (
          <View
            key={i}
            style={[
              styles.segment,
              {
                left: SIZE / 2 + RADIUS * Math.cos(rad) - SEG_W / 2,
                top: SIZE / 2 + RADIUS * Math.sin(rad) - SEG_H / 2,
                transform: [{ rotate: `${angle + 90}deg` }],
                backgroundColor: i < index ? uvScale[uvLevel(i + 1)].background : colors.border,
              },
            ]}
          />
        );
      })}
      <Text style={styles.value}>{index}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gauge: {
    width: SIZE,
    height: SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  segment: {
    position: "absolute",
    width: SEG_W,
    height: SEG_H,
    borderRadius: SEG_H / 2,
  },
  value: {
    fontSize: 72,
    fontWeight: "300",
    color: colors.text,
  },
  label: {
    fontSize: 13,
    color: colors.muted,
  },
});
