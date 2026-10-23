import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useLanguage } from "@/context/LanguageContext";
import { UvProvider } from "@/context/UvContext";
import { colors } from "@/theme";

// Barra de pestañas inferior. La cabecera la pone el Drawer de (app)/_layout.tsx.
// UvProvider: Hoy y Dashboard comparten la misma consulta de UV.
export default function TabsLayout() {
  const { t } = useLanguage();
  return (
    <UvProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarLabelStyle: { fontSize: 11, textTransform: "uppercase" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.today,
            tabBarIcon: ({ color }) => <SymbolView name={{ ios: "sun.max", android: "sunny" }} tintColor={color} />,
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: t.dashboard,
            tabBarIcon: ({ color }) => <SymbolView name={{ ios: "chart.bar", android: "bar_chart" }} tintColor={color} />,
          }}
        />
        <Tabs.Screen
          name="semaforos"
          options={{
            title: t.semaphores,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: "light.beacon.max", android: "traffic" }} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="learn"
          options={{
            title: t.learn,
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: "graduationcap", android: "school" }} tintColor={color} />
            ),
          }}
        />
      </Tabs>
    </UvProvider>
  );
}
