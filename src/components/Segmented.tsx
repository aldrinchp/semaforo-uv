import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

// Selector de varias opciones en una fila (solo una activa), con una línea opcional bajo cada texto.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; detail?: string | null }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.selector} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.option, selected && styles.optionSelected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{o.label}</Text>
            {o.detail && <Text style={[styles.optionDetail, selected && styles.optionTextSelected]}>{o.detail}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  optionSelected: {
    backgroundColor: colors.accent,
  },
  optionText: {
    textAlign: "center",
    fontSize: 13,
    color: colors.accent,
  },
  optionTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  optionDetail: {
    textAlign: "center",
    fontSize: 11,
    color: colors.accent,
  },
});
