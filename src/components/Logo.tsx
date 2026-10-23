import { StyleSheet, Text } from "react-native";
import { colors } from "@/theme";

// "SUN" fino + "SHIELD" en negrita azul, como el logo de la cabecera de la referencia.
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <Text style={[styles.logo, { fontSize: size }]} accessibilityRole="header">
      <Text style={styles.sun}>SUN</Text>
      <Text style={styles.shield}>SHIELD</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    letterSpacing: 1,
  },
  sun: {
    color: colors.text,
    fontWeight: "300",
  },
  shield: {
    color: colors.accent,
    fontWeight: "800",
  },
});
