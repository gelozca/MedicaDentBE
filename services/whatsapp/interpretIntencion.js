const { numeroDias, piezasFdi } = require("./diagnostico");
const { interpretDiagnosis } = require("./interpretDiagnosis");

const INTENCIONES = ["registrar", "consultar", "agendar", "presupuesto", "receta", "recordar", "desconocida"];

const SYSTEM = `Eres un asistente que clasifica lo que el odontólogo dictó. No inventes datos.
intencion solo puede ser: registrar, consultar, agendar, presupuesto, receta, recordar, desconocida.
registrar: anotar un diagnóstico o hallazgo.
consultar: preguntar pendientes o una receta, sin pedir que se guarde. consulta es "pendientes" o "receta".
agendar: pedir una cita o control. seguimientoDias es el número de días, o null si no lo dijo. "mañana" es 1.
presupuesto: pedir una cotización. concepto es el tratamiento y pieza la pieza FDI si la dijo.
receta: dictar medicamentos. Si solo pregunta cuál es la receta, usa consultar y consulta "receta".
recordar: un aviso para el propio doctor. texto es lo que hay que recordar.
desconocida: no encaja.
pacienteNombre solo si dijo un nombre. No inventes dosis, precios ni diagnósticos.
Responde únicamente con JSON:
{"intencion":"desconocida","consulta":null,"pacienteNombre":"","seguimientoDias":null,"motivo":"","concepto":"","pieza":"","texto":"","medicamentos":[]}`;

const medicamentosDichos = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      nombre: String(item?.nombre || "").trim(),
      dosis: String(item?.dosis || "").trim(),
      frecuencia: String(item?.frecuencia || "").trim(),
      duracion: String(item?.duracion || "").trim(),
    }))
    .filter((item) => item.nombre);

const parseIntencion = (text) => {
  const raw = String(text || "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let data;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch (error) {
    return null;
  }
  const intencion = INTENCIONES.includes(data.intencion) ? data.intencion : "desconocida";
  const consulta = data.consulta === "receta" ? "receta" : "pendientes";
  const piezas = piezasFdi([data.pieza]);
  return {
    intencion,
    consulta: intencion === "consultar" ? consulta : null,
    pacienteNombre: String(data.pacienteNombre || "").trim(),
    seguimientoDias: numeroDias(data.seguimientoDias),
    motivo: String(data.motivo || "").trim(),
    concepto: String(data.concepto || "").trim(),
    pieza: piezas[0] || "",
    texto: String(data.texto || "").trim(),
    medicamentos: medicamentosDichos(data.medicamentos),
  };
};

const completar = async (transcription, system) => {
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
        { role: "system", content: system },
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
  return data.choices?.[0]?.message?.content || "";
};

const clasificarIntencion = async (transcription) => {
  const parsed = parseIntencion(await completar(transcription, SYSTEM));
  if (!parsed) {
    const error = new Error("JSON inválido");
    error.code = "invalid";
    throw error;
  }
  if (parsed.intencion !== "registrar") {
    return { ...parsed, transcripcion: transcription };
  }
  const diagnostico = await interpretDiagnosis(transcription);
  return {
    ...parsed,
    intencion: "registrar",
    transcripcion: transcription,
    pacienteNombre: diagnostico.pacienteNombre || parsed.pacienteNombre,
    nombre: diagnostico.nombre,
    certeza: diagnostico.certeza,
    piezasDentales: diagnostico.piezasDentales,
    requiereRevisionPieza: diagnostico.requiereRevisionPieza,
    observaciones: diagnostico.observaciones,
    tratamiento: diagnostico.tratamiento,
    seguimientoDias: diagnostico.seguimientoDias ?? parsed.seguimientoDias,
    pieza: diagnostico.piezasDentales[0] || parsed.pieza,
  };
};

module.exports = { parseIntencion, clasificarIntencion };
