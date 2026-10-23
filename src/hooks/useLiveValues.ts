import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { fetchLive, type Live } from "@/services/devices";

let channelCount = 0; // cada pantalla escucha por su propio canal (si compartieran uno, al cerrar una se cortaría la otra)

// Valores en vivo de todos los semáforos, por id. Mientras la pantalla está a la vista, Supabase
// Realtime avisa al instante cada vez que un semáforo envía un valor nuevo.
export function useLiveValues(): Record<string, Live> {
  const [values, setValues] = useState<Record<string, Live>>({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchLive().then(
        (list) => active && setValues(Object.fromEntries(list.map((l) => [l.device_id, l]))),
        () => {}, // sin internet: se sigue con lo último recibido y la lectura por minuto
      );
      const channel = supabase
        .channel(`device_live_${++channelCount}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "device_live" }, (payload) => {
          const row = payload.new as Live;
          if (active && row?.device_id) setValues((v) => ({ ...v, [row.device_id]: row }));
        })
        .subscribe();
      return () => {
        active = false;
        supabase.removeChannel(channel);
      };
    }, []),
  );

  return values;
}
