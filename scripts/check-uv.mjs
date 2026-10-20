// Comprueba los límites de la escala UV de la OMS. Ejecuta: npm run check:uv
import assert from "node:assert/strict";
import { uvLevel } from "../src/services/uv.ts";

const cases = [
  [0, "low"], [2, "low"], [2.49, "low"], [2.5, "moderate"],
  [5, "moderate"], [6, "high"], [7, "high"], [8, "veryHigh"],
  [10, "veryHigh"], [10.5, "extreme"], [11, "extreme"], [14, "extreme"],
];
for (const [uv, expected] of cases) assert.equal(uvLevel(uv), expected, `UV ${uv}`);
console.log(`OK: ${cases.length} casos de la escala UV`);
