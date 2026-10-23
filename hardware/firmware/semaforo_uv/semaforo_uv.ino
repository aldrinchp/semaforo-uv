// ============================================================================
// SunShield - Semáforo UV (programa final del ESP32)
//
// - Mide el UV cada segundo y lo muestra con las luces. Funciona SIEMPRE, con o sin internet.
// - Envía el UV "en vivo" cuando cambia (o cada 30 s) para el medidor de la app.
// - Cada minuto calcula el UV promedio y el máximo, y los envía a Supabase por WiFi (historial).
// - Sin internet, guarda las lecturas en memoria (hasta 24 h) y las envía al volver la conexión.
// - Modo prueba: escribe un número en el Monitor serie para simular ese UV ("s" vuelve al sensor).
//   Las lecturas simuladas NO se envían a la base de datos.
//
// Antes de subirlo: completa tus datos en secretos.h (copia de secretos.ejemplo.h).
//
// Luces: verde 0-2 · amarillo 3-5 · amarillo+rojo 6-7 · rojo 8-10 · rojo parpadeando 11+
//        azul fijo = WiFi conectado (parpadea si no hay) · blanco = destello al medir y al enviar
// ============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <time.h>
#include "secretos.h"

const char* ZONA_HORARIA = "<-05>5";  // Perú: UTC-5 (solo para mostrar la hora; a Supabase va en UTC)

// Una lectura por minuto (va aquí arriba porque Arduino declara las funciones antes que el resto).
// Guarda cuándo se midió: la hora real (epoch) si ya se sabía, o los milisegundos
// desde que arrancó el ESP32, para calcular la hora real cuando se sincronice.
struct Lectura {
  time_t epoch;   // 0 = todavía no se sabía la hora
  uint32_t ms;
  float uvProm, uvMax;
  uint16_t mv;
};

// ---------- Pines ----------
const int PIN_SENSOR = 34;
const int LED_ROJO = 25, LED_AMARILLO = 26, LED_VERDE = 33, LED_AZUL = 14, LED_BLANCO = 13;

// ---------- Sensor ----------
// Tabla típica del módulo GUVA-S12SD: milivoltios de su salida para cada índice UV, de 0 a 11.
const float TABLA_MV[] = {50, 227, 318, 408, 503, 606, 696, 795, 881, 976, 1079, 1170};
const float PISO_MV = 110;  // por debajo, el ESP32 no mide con precisión: se toma como UV 0

float indiceUV(float mv) {
  if (mv < PISO_MV) return 0;
  for (int i = 1; i < 12; i++) {
    if (mv < TABLA_MV[i]) {
      return (i - 1) + (mv - TABLA_MV[i - 1]) / (TABLA_MV[i] - TABLA_MV[i - 1]);
    }
  }
  return 11 + (mv - TABLA_MV[11]) / 100.0;
}

float leerMilivoltios() {
  long suma = 0;
  for (int i = 0; i < 64; i++) {
    suma += analogReadMilliVolts(PIN_SENSOR);
    delay(2);
  }
  return suma / 64.0;
}

// ---------- Semáforo ----------
const float LIMITES[] = {2.5, 5.5, 7.5, 10.5};
const char* NOMBRES[] = {"Bajo (verde)", "Moderado (amarillo)", "Alto (amarillo + rojo)",
                         "Muy alto (rojo)", "Extremo (rojo parpadeando)"};
const float HISTERESIS = 0.2;

int nivel = 0;
float uvSimulado = -1;  // -1 = usar el sensor

void actualizarNivel(float uv) {
  while (nivel < 4 && uv >= LIMITES[nivel] + HISTERESIS) nivel++;
  while (nivel > 0 && uv < LIMITES[nivel - 1] - HISTERESIS) nivel--;
}

void mostrarNivel(unsigned long ahora) {
  bool parpadeo = (ahora / 500) % 2 == 0;
  digitalWrite(LED_VERDE, nivel == 0);
  digitalWrite(LED_AMARILLO, nivel == 1 || nivel == 2);
  digitalWrite(LED_ROJO, nivel == 2 || nivel == 3 || (nivel == 4 && parpadeo));
}

void leerComandos() {
  if (!Serial.available()) return;
  String texto = Serial.readStringUntil('\n');
  texto.trim();
  if (texto == "s" || texto == "S") {
    uvSimulado = -1;
    Serial.println(">> Usando el sensor");
  } else if (texto.length() > 0) {
    uvSimulado = texto.toFloat();
    Serial.printf(">> Simulando UV %.1f (no se envia a la base de datos; escribe s para volver)\n", uvSimulado);
  }
}

// ---------- WiFi ----------
unsigned long ultimoIntentoWifi = 0;
bool wifiConectadoAntes = false;

void revisarWifi(unsigned long ahora) {
  bool conectado = WiFi.status() == WL_CONNECTED;
  if (conectado && !wifiConectadoAntes) {
    Serial.printf(">> WiFi conectado. IP: %s  Senal: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else if (!conectado && wifiConectadoAntes) {
    Serial.println(">> Se perdio el WiFi. El semaforo sigue funcionando; reintentando...");
    ultimoIntentoWifi = ahora;
  }
  if (!conectado && ahora - ultimoIntentoWifi >= 20000) {
    ultimoIntentoWifi = ahora;
    Serial.printf(">> Conectando a \"%s\"...\n", WIFI_NOMBRE);
    WiFi.disconnect();
    WiFi.begin(WIFI_NOMBRE, WIFI_CLAVE);
  }
  wifiConectadoAntes = conectado;
  digitalWrite(LED_AZUL, conectado || (ahora / 250) % 2 == 0);
}

// ---------- Hora ----------
bool horaValida() { return time(nullptr) > 1700000000; }  // antes de sincronizar marca 1970

String horaLocal() {
  if (!horaValida()) return "sin hora";
  time_t t = time(nullptr);
  struct tm local;
  localtime_r(&t, &local);
  char texto[9];
  strftime(texto, sizeof texto, "%H:%M:%S", &local);
  return texto;
}

// ---------- Lecturas por minuto y cola de envío ----------
const int CAPACIDAD = 1440;  // 24 horas de lecturas (una por minuto)
Lectura cola[CAPACIDAD];
int colaInicio = 0, colaCantidad = 0;

void encolar(const Lectura& l) {
  if (colaCantidad == CAPACIDAD) {  // llena: se descarta la más antigua
    colaInicio = (colaInicio + 1) % CAPACIDAD;
    colaCantidad--;
  }
  cola[(colaInicio + colaCantidad) % CAPACIDAD] = l;
  colaCantidad++;
}

void descartarPrimera() {
  colaInicio = (colaInicio + 1) % CAPACIDAD;
  colaCantidad--;
}

// Acumulado del minuto en curso (solo lecturas reales, no simuladas)
float sumaUV = 0, maxUV = 0, sumaMV = 0;
int muestras = 0;
unsigned long inicioMinuto = 0;

void cerrarMinuto(unsigned long ahora) {
  inicioMinuto = ahora;
  if (muestras == 0) return;
  Lectura l = {horaValida() ? time(nullptr) : 0, ahora, sumaUV / muestras, maxUV,
               (uint16_t)(sumaMV / muestras)};
  encolar(l);
  Serial.printf(">> Minuto guardado: UV promedio %.2f, maximo %.2f. Pendientes de enviar: %d\n",
                l.uvProm, l.uvMax, colaCantidad);
  sumaUV = maxUV = sumaMV = 0;
  muestras = 0;
}

// ---------- Envío a Supabase ----------
NetworkClientSecure clienteSeguro;

// Llama a una función de Supabase. Devuelve el código HTTP (2xx = bien); en `error`, el motivo si falló.
int llamarSupabase(const char* funcion, const char* cuerpo, String& error) {
  digitalWrite(LED_BLANCO, HIGH);  // destello mientras envía
  HTTPClient http;
  http.setTimeout(10000);
  http.setReuse(false);  // "Connection: close": Supabase cierra la conexión al terminar de responder
  http.begin(clienteSeguro, String(SUPABASE_URL) + "/rest/v1/rpc/" + funcion);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  int codigo = http.POST(cuerpo);
  // Si salió bien, Supabase responde 204 (sin contenido): no hay nada que leer, y leerlo dejaría
  // el programa esperando. Solo los errores traen un mensaje útil.
  if (codigo < 0) error = HTTPClient::errorToString(codigo);
  else if (codigo >= 300) error = http.getString();
  http.end();
  digitalWrite(LED_BLANCO, LOW);
  return codigo;
}

// Historial: envía la lectura de minuto más antigua que quede pendiente.
unsigned long proximoEnvio = 0;

void enviarPendientes(unsigned long ahora) {
  if (colaCantidad == 0 || WiFi.status() != WL_CONNECTED || !horaValida()) return;
  if ((long)(ahora - proximoEnvio) < 0) return;

  Lectura& l = cola[colaInicio];
  time_t medida = l.epoch ? l.epoch : time(nullptr) - (ahora - l.ms) / 1000;
  struct tm utc;
  gmtime_r(&medida, &utc);
  char fecha[25];
  strftime(fecha, sizeof fecha, "%Y-%m-%dT%H:%M:%SZ", &utc);

  char cuerpo[256];
  snprintf(cuerpo, sizeof cuerpo,
           "{\"p_device_key\":\"%s\",\"p_uv_avg\":%.2f,\"p_uv_max\":%.2f,\"p_mv\":%u,\"p_measured_at\":\"%s\"}",
           CLAVE_SEMAFORO, l.uvProm, l.uvMax, l.mv, fecha);
  String error;
  int codigo = llamarSupabase("record_uv_reading", cuerpo, error);

  if (codigo >= 200 && codigo < 300) {
    descartarPrimera();
    Serial.printf(">> Enviada a Supabase (%s UTC). Pendientes: %d\n", fecha, colaCantidad);
    proximoEnvio = ahora + 1000;  // si hay atrasadas, una por segundo
  } else if (codigo >= 400 && codigo < 500) {
    // La base de datos la rechazó (clave o datos inválidos): reintentarla no servirá.
    descartarPrimera();
    Serial.printf(">> RECHAZADA por Supabase (%d): %s\n", codigo, error.c_str());
    if (error.indexOf("Clave") >= 0) Serial.println(">> Revisa CLAVE_SEMAFORO en secretos.h");
    proximoEnvio = ahora + 1000;
  } else {
    // Sin respuesta o error del servidor: se reintenta más tarde, sin perder la lectura.
    Serial.printf(">> No se pudo enviar (%d: %s). Reintento en 30 s\n", codigo, error.c_str());
    proximoEnvio = ahora + 30000;
  }
}

// En vivo: el UV de este momento, para el medidor de la app. Se envía cuando cambia de forma
// apreciable o, si no cambia, cada 30 s (así la app sabe que el semáforo sigue conectado).
// No se guarda si no hay WiFi: solo importa el valor actual.
const float CAMBIO_VIVO = 0.2;
const unsigned long LATIDO_VIVO = 30000;
float ultimoUVVivo = -100;  // fuerza el primer envío
unsigned long ultimoEnvioVivo = 0;

void enviarVivo(float uv, unsigned long ahora) {
  if (WiFi.status() != WL_CONNECTED) return;
  if (fabsf(uv - ultimoUVVivo) < CAMBIO_VIVO && ahora - ultimoEnvioVivo < LATIDO_VIVO) return;
  // Aunque falle, se da por intentado: se vuelve a probar con el siguiente cambio o latido.
  ultimoUVVivo = uv;
  ultimoEnvioVivo = ahora;
  char cuerpo[160];
  snprintf(cuerpo, sizeof cuerpo, "{\"p_device_key\":\"%s\",\"p_uv\":%.2f}", CLAVE_SEMAFORO, uv);
  String error;
  int codigo = llamarSupabase("record_live_uv", cuerpo, error);
  if (codigo >= 200 && codigo < 300) Serial.printf(">> En vivo: UV %.2f\n", uv);
  else Serial.printf(">> Valor en vivo no enviado (%d: %s)\n", codigo, error.c_str());
}

// ============================================================================

unsigned long ultimaLectura = 0;
bool horaAvisada = false;

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(100);
  // Mide mejor los voltajes bajos (~100-1250 mV). Tiene que ser la versión general y antes de la
  // primera lectura: analogSetPinAttenuation no hace nada si el pin aún no se ha leído.
  analogSetAttenuation(ADC_2_5db);
  for (int pin : {LED_ROJO, LED_AMARILLO, LED_VERDE, LED_AZUL, LED_BLANCO}) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
  }
  clienteSeguro.useBuiltinCACertBundle();  // verifica el certificado HTTPS de Supabase
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_NOMBRE, WIFI_CLAVE);
  ultimoIntentoWifi = millis();
  configTzTime(ZONA_HORARIA, "pool.ntp.org", "time.google.com");
  Serial.printf("SunShield - semaforo UV. Conectando a \"%s\"...\n", WIFI_NOMBRE);
}

void loop() {
  unsigned long ahora = millis();
  leerComandos();
  revisarWifi(ahora);

  if (!horaAvisada && horaValida()) {
    horaAvisada = true;
    Serial.println(">> Hora sincronizada por internet: " + horaLocal());
  }

  // Una lectura por segundo
  if (ahora - ultimaLectura >= 1000) {
    ultimaLectura = ahora;
    digitalWrite(LED_BLANCO, HIGH);
    float mv = leerMilivoltios();
    digitalWrite(LED_BLANCO, LOW);
    bool simulado = uvSimulado >= 0;
    float uv = simulado ? uvSimulado : indiceUV(mv);
    actualizarNivel(uv);
    if (!simulado) {
      enviarVivo(uv, ahora);
      sumaUV += uv;
      sumaMV += mv;
      if (uv > maxUV) maxUV = uv;
      muestras++;
    }
    Serial.printf("[%s] Sensor: %4.0f mV | UV %.1f%s | Nivel: %s | WiFi: %s\n", horaLocal().c_str(), mv,
                  uv, simulado ? " (simulado)" : "", NOMBRES[nivel],
                  WiFi.status() == WL_CONNECTED ? "si" : "no");
  }

  if (ahora - inicioMinuto >= 60000) cerrarMinuto(ahora);
  enviarPendientes(ahora);
  mostrarNivel(ahora);
}
