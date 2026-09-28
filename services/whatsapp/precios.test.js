const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buscarPrecio } = require("./precios");
const { parseIntencion } = require("./interpretIntencion");

const catalogo = [
  { nombre: "Endodoncia", alias: ["endodoncia", "conducto"], precio: 3500 },
  { nombre: "Consulta", alias: ["consulta"], precio: 500 },
];

test("elige el precio cuyo alias cabe en lo dictado", () => {
  assert.equal(buscarPrecio(catalogo, "presupuesto de la endodoncia del 46").nombre, "Endodoncia");
  assert.equal(buscarPrecio(catalogo, "limpieza"), null);
});

test("clasifica una consulta sin escribir campos de más", () => {
  const turno = parseIntencion(`{
    "intencion": "agendar",
    "pacienteNombre": "",
    "seguimientoDias": 7,
    "motivo": "control",
    "concepto": "",
    "pieza": "46",
    "texto": "",
    "medicamentos": []
  }`);
  assert.equal(turno.intencion, "agendar");
  assert.equal(turno.seguimientoDias, 7);
  assert.equal(turno.pieza, "46");
  assert.equal(parseIntencion("no es json"), null);
});
