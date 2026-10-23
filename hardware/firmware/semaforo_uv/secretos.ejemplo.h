// Plantilla de datos privados. Copia este archivo como "secretos.h" (en esta misma carpeta)
// y completa tus datos. secretos.h NO se sube a GitHub (está en .gitignore).
#pragma once

#define WIFI_NOMBRE "NOMBRE_DE_TU_RED"   // red de 2,4 GHz
#define WIFI_CLAVE "CLAVE_DE_TU_RED"     // "" si la red no tiene contraseña

// Los mismos valores que EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_KEY de la app (.env.local)
#define SUPABASE_URL "https://TU_PROYECTO.supabase.co"
#define SUPABASE_KEY "sb_publishable_..."

// La clave que te dio: select public.register_device(...);  ¡No la compartas!
#define CLAVE_SEMAFORO "PEGA_AQUI_LA_CLAVE_DEL_SEMAFORO"
