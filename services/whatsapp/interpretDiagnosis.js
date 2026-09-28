const { parseDiagnosis } = require("./diagnostico");

const SYSTEM = `Eres un asistente que extrae un diagnóstico odontológico de lo que el médico dictó.
No actúes como médico. No inventes síntomas, diagnósticos, piezas ni tratamientos.
No conviertas una posibilidad en diagnóstico definitivo.
Si no mencionó un diagnóstico, deja "nombre" vacío.
Si mencionó el nombre del paciente, ponlo en pacienteNombre aunque venga junto a la palabra diagnóstico.
Usa notación FDI para las piezas. Ejemplos: primer molar inferior derecho = 46, segundo molar inferior derecho = 47, primer molar inferior izquierdo = 36, primer molar superior derecho = 16, primer molar superior izquierdo = 26.
Si la pieza es ambigua, por ejemplo "el molar inferior", deja piezasDentales vacío y requiereRevisionPieza en true.
certeza solo puede ser definitivo, presuntivo o no_especificado.
Si mencionó un tratamiento o plan, ponlo en tratamiento. Si no lo dijo, déjalo vacío.
Si pidió un control o revisión en N días, pon ese número en seguimientoDias. "mañana" es 1. Si no lo dijo, null.
Responde únicamente con JSON:
{"pacienteNombre":"","nombre":"","certeza":"no_especificado","piezasDentales":[],"requiereRevisionPieza":false,"observaciones":"","tratamiento":"","seguimientoDias":null}`;

const interpretDiagnosis = async (transcription) => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.SPEECH_TO_TEXT_API_KEY;
  if (!apiKey) {
    const error = new Error("OpenAI no configurado");
    error.code = "config";
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: transcription },
      ],
    }),
  });

  if (!response.ok) {
    const error = new Error("Error de OpenAI");
    error.code = "provider";
    throw error;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const parsed = parseDiagnosis(text);
  if (!parsed) {
    const error = new Error("JSON inválido");
    error.code = "invalid";
    throw error;
  }
  return parsed;
};

module.exports = { interpretDiagnosis };
