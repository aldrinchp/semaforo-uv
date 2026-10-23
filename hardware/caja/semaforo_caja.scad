// ============================================================================
// SunShield - Caja del semáforo UV (prototipo para demostración, PLA)
//
// Ábrelo con OpenSCAD (gratis, openscad.org): F5 = vista previa, F6 = render,
// Archivo > Exportar > STL. Cambia "pieza" para elegir qué exportar.
// Todas las medidas en milímetros.
//
// Cómo va armado:
//  - Base: la protoboard pegada al fondo, con el ESP32 encima (USB hacia la
//    pared izquierda, por el agujero del cable).
//  - Pared frontal: los 5 LED, metidos desde dentro (el aro queda apoyado en la
//    pared). Rojo, amarillo y verde con visera; azul (WiFi) y blanco (ON) aparte.
//  - Tapa: el sensor UV va ENCIMA, al aire, mirando al cielo (el plástico
//    bloquea el UV). Su tira de 3 pines baja por una ranura hacia dentro.
// ============================================================================

pieza = "vista"; // "base", "tapa" (ya volteada para imprimir) o "vista" (armado, solo para ver)

// ---------- Medidas de tus piezas ----------
protoboard = [82, 55, 9];      // largo, ancho, alto
esp32 = [48, 26];              // placa sin pines: largo, ancho
sensor = [11, 28, 1.6];        // GUVA-S12SD: ancho, largo, grosor de la placa
led_d = 5;                     // cabeza del LED
led_aro_d = 6;                 // aro de la base del LED

// ---------- Estimaciones (no medidas; si algo no encaja, ajusta aquí) ----------
usb_centro_sobre_protoboard = 5.7;  // superficie de la protoboard -> centro del conector USB
usb_agujero = [14, 10];             // hueco para el enchufe del cable USB-C (ancho, alto)
sensor_pines_desde_borde = 1.4;     // borde de la placa del sensor -> centro de VCC/GND/SIG
sensor_separador = [7.6, 2.5];      // plástico negro de la tira de 3 pines (largo, ancho)
sensor_agujeros = [[3.1, 25.2], [9.3, 25.2]]; // agujeros grandes (x desde el borde izquierdo, y desde el borde de los pines)

// ---------- Diseño ----------
pared = 2.4;
suelo = 2;
exterior = [100, 70, 50]; // largo, ancho y alto de la caja (sin la tapa, que suma 2,4 mm)
radio = 3;            // esquinas redondeadas
tapa_grosor = 2.4;
ceja_alto = 4;        // borde de la tapa que entra en la caja (encaje a presión)
ceja_grosor = 1.6;
ajuste = 0.25;        // juego entre la ceja y la pared (súbelo si entra muy duro)
led_altura = 36;      // centro de los LED sobre el suelo interior (por encima de los cables)
leds = [               // posición desde el centro de la pared frontal, color y texto debajo
  [-32.5, "red", ""],
  [-16.5, "yellow", ""],
  [-0.5, "green", ""],
  [19.5, "blue", "WiFi"],
  [32.5, "white", "ON"],
];
fuente = "Liberation Sans:style=Bold";
$fn = 64;

// ---------- Medidas derivadas ----------
ox = exterior[0];
oy = exterior[1];
alto_base = exterior[2];
ix = ox - 2 * pared;   // interior: 95,2 x 65,2 x 48 mm con las medidas de arriba
iy = oy - 2 * pared;
assert(ix >= protoboard[0] + 2 && iy >= protoboard[1] + 2, "La protoboard no cabe: agranda la caja");
usb_z = suelo + protoboard[2] + usb_centro_sobre_protoboard;
// Sensor en la tapa: detrás a la derecha, con los pines hacia la pared trasera.
sensor_x = ox - 25;         // borde izquierdo de la placa
sensor_y = oy - 9;          // borde de los pines (la placa se extiende hacia delante)

// ============================================================================

module caja_redondeada(tam, r) {
  hull() for (x = [r, tam[0] - r], y = [r, tam[1] - r])
    translate([x, y, 0]) cylinder(r = r, h = tam[2]);
}

// Media visera sobre el LED (como un semáforo de calle): da sombra para que se
// vea mejor a pleno sol. Se imprime sin soportes, como un agujero horizontal.
module visera() {
  rotate([90, 0, 0]) difference() {
    cylinder(r = 5.6, h = 9);
    translate([0, 0, -1]) cylinder(r = 4.4, h = 11);
    translate([-7, -7, -1]) cube([14, 7, 11]);
  }
}

module base() {
  difference() {
    caja_redondeada([ox, oy, alto_base], radio);
    translate([pared, pared, suelo]) cube([ix, iy, alto_base]);
    // Agujeros de los LED en la pared frontal
    for (l = leds)
      translate([ox / 2 + l[0], -1, suelo + led_altura]) rotate([-90, 0, 0])
        cylinder(d = led_d + 0.3, h = pared + 2);
    // Texto debajo del azul y del blanco (grabado 0,6 mm)
    for (l = leds) if (l[2] != "")
      translate([ox / 2 + l[0], 0.6, suelo + led_altura - 11]) rotate([90, 0, 0])
        linear_extrude(1) text(l[2], size = 4, font = fuente, halign = "center");
    // Agujero del cable USB (pared izquierda), a la altura del conector del ESP32
    translate([-1, pared + iy / 2 - usb_agujero[0] / 2, usb_z - usb_agujero[1] / 2])
      cube([pared + 2, usb_agujero[0], usb_agujero[1]]);
    // Muesca en la pared trasera para levantar la tapa con el dedo
    translate([ox / 2, oy + 1, alto_base]) rotate([90, 0, 0]) cylinder(d = 14, h = pared + 2);
  }
  for (l = leds) translate([ox / 2 + l[0], 0, suelo + led_altura]) visera();
}

// Cortes del sensor, en coordenadas de su placa: x de 0 a 11 (izquierda a derecha
// con el texto VCC GND SIG derecho) e y de 0 a 28 desde el borde de los pines.
module cortes_sensor() {
  // Hueco de 1 mm donde se apoya la placa (no se mueve hacia los lados)
  translate([-0.3, -0.3, tapa_grosor - 1]) cube([sensor[0] + 0.6, sensor[1] + 0.6, 2]);
  // Ranura para el plástico negro de los pines: así la placa queda plana sobre la tapa
  translate([sensor[0] / 2 - sensor_separador[0] / 2 - 0.4, -0.3, -1])
    cube([sensor_separador[0] + 0.8, sensor_pines_desde_borde + sensor_separador[1] / 2 + 1, tapa_grosor + 2]);
  // Dos agujeros bajo los agujeros grandes: para un precinto (brida) o tornillo M2.5 opcional
  for (a = sensor_agujeros) translate([a[0], a[1], -1]) cylinder(d = 3, h = tapa_grosor + 2);
}

module tapa() {
  difference() {
    union() {
      caja_redondeada([ox, oy, tapa_grosor], radio);
      translate([pared + ajuste, pared + ajuste, -ceja_alto]) difference() {
        cube([ix - 2 * ajuste, iy - 2 * ajuste, ceja_alto]);
        translate([ceja_grosor, ceja_grosor, -1])
          cube([ix - 2 * ajuste - 2 * ceja_grosor, iy - 2 * ajuste - 2 * ceja_grosor, ceja_alto + 2]);
      }
    }
    translate([sensor_x, sensor_y, 0]) mirror([0, 1, 0]) cortes_sensor();
    // Textos grabados 0,6 mm
    translate([8, 12, tapa_grosor - 0.6]) linear_extrude(1)
      text("SunShield", size = 9, font = fuente);
    translate([sensor_x - 4, sensor_y - 18, tapa_grosor - 0.6]) linear_extrude(1)
      text("UV", size = 6, font = fuente, halign = "right");
  }
}

// ---------- Piezas de referencia (solo para la vista, no se imprimen) ----------
module componentes() {
  // Protoboard empujada hacia la pared del USB (3 mm) y centrada a lo ancho
  bx = pared + 3; by = pared + (iy - protoboard[1]) / 2;
  color("white") translate([bx, by, suelo]) cube(protoboard);
  // ESP32 encima de la protoboard, centrado en la ranura central, USB hacia la izquierda
  translate([bx + 3, by + protoboard[1] / 2 - esp32[1] / 2, suelo + protoboard[2]]) {
    color("black") translate([0, 0, 2.5]) cube([esp32[0], esp32[1], 1.6]);
    color("dimgray") for (y = [1, esp32[1] - 3.5]) translate([1, y, 0]) cube([esp32[0] - 2, 2.5, 2.5]);
    color("silver") translate([-3, esp32[1] / 2 - 4.5, 4.1]) cube([8, 9, 3.2]);
    color("silver") translate([22, 5, 4.1]) cube([18, 16, 3]);
  }
  // LED metidos desde dentro, con sus patitas
  for (l = leds) translate([ox / 2 + l[0], pared, suelo + led_altura]) rotate([90, 0, 0]) {
    color(l[1]) translate([0, 0, -1]) cylinder(d = led_aro_d, h = 1);
    color(l[1]) cylinder(d = led_d, h = 7.6);
    color(l[1]) translate([0, 0, 7.6]) sphere(d = led_d);
    color("silver") for (x = [-1.27, 1.27]) translate([x, 0, -20]) cylinder(d = 0.5, h = 19);
  }
}

module sensor_puesto() {
  translate([sensor_x, sensor_y, tapa_grosor - 1]) mirror([0, 1, 0]) {
    color("purple") cube(sensor);
    color("white") translate([sensor[0] / 2 - 1.75, 17.75, sensor[2]]) cube([3.5, 3.5, 1]);
    color("black") translate([sensor[0] / 2 - sensor_separador[0] / 2, sensor_pines_desde_borde - sensor_separador[1] / 2, -2.5])
      cube([sensor_separador[0], sensor_separador[1], 2.5]);
    color("gold") for (i = [-1, 0, 1]) translate([sensor[0] / 2 + i * 2.54, sensor_pines_desde_borde, -8.5])
      cylinder(d = 0.64, h = 8.5);
  }
}

if (pieza == "base") base();
if (pieza == "tapa") translate([0, oy, tapa_grosor]) rotate([180, 0, 0]) tapa();
if (pieza == "vista") {
  color("lightskyblue") base();
  componentes();
  // Tapa levantada 30 mm para ver el interior
  translate([0, 0, alto_base + 30]) { color("lightskyblue") tapa(); sensor_puesto(); }
}
