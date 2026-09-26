const DOCTOR_ROL_ID = "1eba8d59-6dbe-498f-ac95-9c1de7d65907";

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

const normalizePhone = (value) => {
  const raw = String(value || "").replace(/^whatsapp:/i, "");
  return digitsOnly(raw);
};

const phonesMatch = (stored, incoming) => {
  const left = digitsOnly(stored);
  const right = normalizePhone(incoming);
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }
  const tail = 10;
  return left.length >= tail && right.length >= tail && left.slice(-tail) === right.slice(-tail);
};

const nombreCompleto = (persona) =>
  [persona.nombre, persona.apellido_paterno, persona.apellido_materno]
    .filter(Boolean)
    .join(" ");

const CERTEZA = ["definitivo", "presuntivo", "no_especificado"];

const parseDiagnosis = (text) => {
  const raw = String(text || "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch (error) {
    return null;
  }

  const nombre = String(data.nombre || "").trim();
  const certeza = CERTEZA.includes(data.certeza) ? data.certeza : "no_especificado";
  const piezas = Array.isArray(data.piezasDentales)
    ? data.piezasDentales.map((pieza) => String(pieza).trim()).filter((pieza) => /^\d{2}$/.test(pieza))
    : [];

  return {
    pacienteNombre: String(data.pacienteNombre || "").trim(),
    nombre,
    certeza,
    piezasDentales: piezas,
    requiereRevisionPieza: piezas.length === 0 ? Boolean(data.requiereRevisionPieza) : false,
    observaciones: String(data.observaciones || "").trim(),
  };
};

const etiquetaCerteza = (certeza) => {
  if (certeza === "definitivo") return "Definitivo";
  if (certeza === "presuntivo") return "Presuntivo";
  return "No especificado";
};

const resumenDiagnostico = (borrador, paciente) => {
  const piezas = borrador.piezasDentales?.length
    ? borrador.piezasDentales.join(", ")
    : borrador.requiereRevisionPieza
      ? "No identificada. Indica la pieza FDI si quieres registrarla."
      : "No mencionada";

  const lineas = [
    "Revisa el diagnóstico",
    "",
    `Paciente: ${paciente}`,
    `Diagnóstico: ${borrador.nombre}`,
    `Certeza: ${etiquetaCerteza(borrador.certeza)}`,
    `Piezas: ${piezas}`,
  ];

  if (borrador.observaciones) {
    lineas.push(`Observaciones: ${borrador.observaciones}`);
  }

  lineas.push(
    "",
    "Responde 1 para guardar o 2 para descartar.",
    "Para corregir, escribe de nuevo lo que debe decir la nota.",
    "Para cambiar de paciente, responde 2 y dicta otra vez."
  );

  return lineas.join("\n");
};

module.exports = {
  DOCTOR_ROL_ID,
  normalizePhone,
  phonesMatch,
  nombreCompleto,
  parseDiagnosis,
  resumenDiagnostico,
};
