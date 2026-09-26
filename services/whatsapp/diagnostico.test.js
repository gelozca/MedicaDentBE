const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizePhone,
  phonesMatch,
  parseDiagnosis,
} = require("./diagnostico");

test("normaliza el número de WhatsApp", () => {
  assert.equal(normalizePhone("whatsapp:+15187403218"), "15187403218");
  assert.equal(normalizePhone("81 1234 5678"), "8112345678");
});

test("compara teléfonos con y sin código de país", () => {
  assert.equal(phonesMatch("5187403218", "whatsapp:+15187403218"), true);
  assert.equal(phonesMatch("8112345678", "whatsapp:+528112345678"), true);
  assert.equal(phonesMatch("8112345678", "whatsapp:+15187403218"), false);
});

test("extrae el diagnóstico dicho y no inventa pieza ambigua", () => {
  const claro = parseDiagnosis(`{
    "pacienteNombre": "Juan Pérez",
    "nombre": "Pulpitis irreversible",
    "certeza": "presuntivo",
    "piezasDentales": ["46"],
    "requiereRevisionPieza": false,
    "observaciones": ""
  }`);
  assert.equal(claro.nombre, "Pulpitis irreversible");
  assert.deepEqual(claro.piezasDentales, ["46"]);
  assert.equal(claro.certeza, "presuntivo");

  const ambiguo = parseDiagnosis(`{
    "pacienteNombre": "",
    "nombre": "Caries",
    "certeza": "no_especificado",
    "piezasDentales": [],
    "requiereRevisionPieza": true,
    "observaciones": ""
  }`);
  assert.deepEqual(ambiguo.piezasDentales, []);
  assert.equal(ambiguo.requiereRevisionPieza, true);

  const sinDiagnostico = parseDiagnosis(`{
    "pacienteNombre": "Ana",
    "nombre": "",
    "certeza": "definitivo",
    "piezasDentales": ["16"],
    "requiereRevisionPieza": false,
    "observaciones": ""
  }`);
  assert.equal(sinDiagnostico.nombre, "");
});

test("rechaza JSON inválido y piezas que no son FDI", () => {
  assert.equal(parseDiagnosis("no es json"), null);
  const piezaInventada = parseDiagnosis(`{
    "nombre": "Caries",
    "certeza": "posible",
    "piezasDentales": ["molar inferior"],
    "requiereRevisionPieza": false
  }`);
  assert.deepEqual(piezaInventada.piezasDentales, []);
  assert.equal(piezaInventada.certeza, "no_especificado");
});
