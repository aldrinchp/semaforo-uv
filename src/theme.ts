import { StyleSheet } from "react-native";

// Colores de la app: tarjetas blancas sobre fondo gris claro, acento azul.
// El azul tiene contraste suficiente (AA) para texto blanco encima.
export const colors = {
  accent: "#0277BD",
  accentSoft: "#E1F0F8", // fondo claro para iconos en círculo
  background: "#F2F2F2",
  card: "#fff",
  border: "#E3E3E3",
  text: "#222",
  muted: "#777",
  danger: "#C62828",
  // Puntos de las gráficas: azul oscuro para leerse sobre las franjas de color (contraste >= 4,8:1 al 45 %).
  chart: "#0D3B66",
};

// Sombra suave (en vez de borde) para lo que flota sobre el fondo: elevation en Android, shadow* en iOS.
export const shadow = {
  elevation: 2,
  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
};

// Estilos compartidos por las pantallas con pestañas.
export const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  cardTitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
});
