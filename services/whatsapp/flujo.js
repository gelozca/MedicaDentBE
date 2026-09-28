const { resumenDiagnostico } = require("./diagnostico");
const { speechToText } = require("./speechToText");
const { clasificarIntencion } = require("./interpretIntencion");
const { downloadMedia } = require("./twilioClient");
const {
  buscarPacientes,
  getConversacion,
  guardarConversacion,
  borrarConversacion,
  etiquetaPaciente,
  etiquetaPorId,
} = require("./conversacion");
const { confirmarBorrador, precioDeConcepto } = require("./confirmar");
const pool = require("../../dao/dbConnections");

const MENU =
  "No entendí. Puedes anotar, consultar, agendar, cotizar, recetar o recordar.";

const mensajeError = (error) => {
  if (error.code === "config") return "El servicio de voz todavía no está configurado en el servidor.";
  if (error.code === "empty") return "No se entendió el audio. Dicta la nota otra vez.";
  if (error.code === "upload") return "No pude recibir el audio. Intenta enviarlo de nuevo.";
  if (error.code === "invalid") return "No pude interpretar la nota. Dictala de nuevo.";
  return "No pude procesar la nota. Intenta de nuevo.";
};

const listaPacientes = (pacientes) => {
  const lineas = ["Elige al paciente. Responde con el número:"];
  pacientes.forEach((paciente, index) => {
    const nombre = paciente.apellido_paterno === undefined ? paciente.nombre : etiquetaPaciente(paciente);
    lineas.push(`${index + 1}. ${nombre}`);
  });
  return lineas.join("\n");
};

const dinero = (valor) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(valor) || 0);

const instrucciones = [
  "",
  "Responde 1 para guardar o 2 para descartar.",
  "Para corregir, escribe de nuevo lo que debe decir.",
];

const resumenTurno = (borrador, paciente) => {
  if (!borrador.intencion || borrador.intencion === "registrar") {
    return resumenDiagnostico(borrador, paciente);
  }
  if (borrador.intencion === "agendar") {
    return [`Revisa la cita`, "", `Paciente: ${paciente}`, `Control en ${borrador.seguimientoDias} días`, borrador.motivo ? `Motivo: ${borrador.motivo}` : "", ...instrucciones]
      .filter((linea) => linea !== undefined)
      .join("\n");
  }
  if (borrador.intencion === "presupuesto") {
    return [
      "Revisa el presupuesto",
      "",
      `Paciente: ${paciente}`,
      `Concepto: ${borrador.concepto}`,
      `Pieza: ${borrador.pieza || "No mencionada"}`,
      `Precio: ${dinero(borrador.precio)}`,
      "Si hay un diagnóstico de esa pieza, se liga al confirmar.",
      ...instrucciones,
    ].join("\n");
  }
  if (borrador.intencion === "receta") {
    const meds = (borrador.medicamentos || []).map(
      (item) => `- ${item.nombre} ${item.dosis} ${item.frecuencia} ${item.duracion}`.replace(/\s+/g, " ").trim()
    );
    return ["Revisa la receta", "", `Paciente: ${paciente}`, ...meds, ...instrucciones].join("\n");
  }
  if (borrador.intencion === "recordar") {
    const cuando = borrador.seguimientoDias ? `en ${borrador.seguimientoDias} días` : "hoy";
    return ["Revisa el recordatorio", "", `Paciente: ${paciente}`, `${borrador.texto} (${cuando})`, ...instrucciones].join("\n");
  }
  return MENU;
};

const guardar = (datos) => guardarConversacion(datos);

const pedirPaciente = async ({ telefono, doctor, borrador }) => {
  await guardar({
    telefono,
    doctorId: doctor.id,
    estado: "identificar_paciente",
    pacienteId: null,
    diagnosticoId: null,
    borrador,
  });
  return "¿De qué paciente? Escribe el nombre.";
};

const ofrecerLista = async ({ telefono, doctor, borrador, pacientes }) => {
  await guardar({
    telefono,
    doctorId: doctor.id,
    estado: "elegir_paciente",
    pacienteId: null,
    diagnosticoId: null,
    borrador: {
      ...borrador,
      candidatos: pacientes.map((paciente) => ({
        id: paciente.id,
        nombre: etiquetaPaciente(paciente),
      })),
    },
  });
  return listaPacientes(pacientes);
};

const textoPendientes = async (pacienteId, etiqueta) => {
  const tratamientos = await pool.query(
    `SELECT COALESCE(pieza, 'sin pieza') AS pieza, nombre
     FROM tratamiento
     WHERE paciente_id = $1 AND estado = 'pendiente'
     ORDER BY created_at`,
    [pacienteId]
  );
  const citas = await pool.query(
    `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha,
            to_char(hora, 'HH24:MI') AS hora,
            motivo
     FROM cita
     WHERE paciente_id = $1 AND estado = 'programada'
       AND fecha >= (timezone('America/Mexico_City', now()))::date
     ORDER BY fecha
     LIMIT 8`,
    [pacienteId]
  );
  if (tratamientos.rows.length === 0 && citas.rows.length === 0) {
    return `${etiqueta} no tiene pendientes.`;
  }
  const lineas = [`Pendientes de ${etiqueta}`];
  if (tratamientos.rows.length > 0) {
    lineas.push("Tratamientos:");
    tratamientos.rows.forEach((item) => lineas.push(`- ${item.nombre}, pieza ${item.pieza}`));
  }
  if (citas.rows.length > 0) {
    lineas.push("Citas:");
    citas.rows.forEach((item) => lineas.push(`- ${item.fecha}${item.hora ? ` ${item.hora}` : ""} ${item.motivo || ""}`.trim()));
  }
  return lineas.join("\n");
};

const textoReceta = async (pacienteId, etiqueta, diagnosticoId) => {
  const receta = await pool.query(
    `SELECT r.id
     FROM receta r
     WHERE r.paciente_id = $1
       AND ($2::uuid IS NULL OR r.diagnostico_id = $2 OR r.diagnostico_id IS NULL)
     ORDER BY (r.diagnostico_id IS NOT DISTINCT FROM $2::uuid) DESC, r.created_at DESC
     LIMIT 1`,
    [pacienteId, diagnosticoId || null]
  );
  if (!receta.rows[0]) return `${etiqueta} no tiene receta.`;
  const meds = await pool.query(
    "SELECT nombre, dosis, frecuencia, duracion FROM receta_medicamento WHERE receta_id = $1",
    [receta.rows[0].id]
  );
  const lineas = [`Receta de ${etiqueta}`];
  meds.rows.forEach((item) => {
    lineas.push(`- ${[item.nombre, item.dosis, item.frecuencia, item.duracion].filter(Boolean).join(", ")}`);
  });
  return lineas.join("\n");
};

const dejarConsulta = async ({ telefono, doctor, pacienteId, diagnosticoId }) => {
  await guardar({
    telefono,
    doctorId: doctor.id,
    estado: "en_consulta",
    pacienteId,
    diagnosticoId: diagnosticoId || null,
    borrador: null,
  });
};

const responderConsulta = async ({ telefono, doctor, borrador, pacienteId, diagnosticoId, etiqueta }) => {
  const texto = borrador.consulta === "receta"
    ? await textoReceta(pacienteId, etiqueta, diagnosticoId)
    : await textoPendientes(pacienteId, etiqueta);
  await dejarConsulta({ telefono, doctor, pacienteId, diagnosticoId });
  return texto;
};

const prepararBorrador = async (turno) => {
  const borrador = { ...turno, intencion: turno.intencion };
  if (turno.intencion === "presupuesto") {
    const precio = await precioDeConcepto(turno.concepto);
    if (!precio) {
      return { error: `No tengo precio de "${turno.concepto || "ese concepto"}" en el catálogo.` };
    }
    borrador.concepto = precio.nombre;
    borrador.precio = precio.precio;
    borrador.catalogoId = precio.id;
  }
  return { borrador };
};

const validarTurno = (turno) => {
  if (turno.intencion === "desconocida") return MENU;
  if (turno.intencion === "registrar" && !turno.nombre) {
    return "No escuché un diagnóstico. Dilo de nuevo, por ejemplo: caries en el 46, presuntiva.";
  }
  if (turno.intencion === "agendar" && turno.seguimientoDias === null) {
    return "¿En cuántos días agendo el control?";
  }
  if (turno.intencion === "presupuesto" && !turno.concepto) {
    return "¿Qué tratamiento cotizo?";
  }
  if (turno.intencion === "receta" && (!turno.medicamentos || turno.medicamentos.length === 0)) {
    return "Dicta el medicamento, la dosis, la frecuencia y la duración.";
  }
  if (turno.intencion === "recordar" && !turno.texto) {
    return "¿Qué quieres que te recuerde?";
  }
  return null;
};

const abrirConPaciente = async ({ telefono, doctor, borrador, pacienteId, diagnosticoId, etiqueta }) => {
  if (borrador.intencion === "consultar") {
    return responderConsulta({ telefono, doctor, borrador, pacienteId, diagnosticoId, etiqueta });
  }
  await guardar({
    telefono,
    doctorId: doctor.id,
    estado: "revisar",
    pacienteId,
    diagnosticoId,
    borrador,
  });
  return resumenTurno(borrador, etiqueta);
};

const resolverNombre = async ({ telefono, doctor, borrador, conversacion, nombre }) => {
  const pacientes = await buscarPacientes(nombre);
  if (pacientes.length === 0) {
    await guardar({
      telefono,
      doctorId: doctor.id,
      estado: "identificar_paciente",
      pacienteId: null,
      diagnosticoId: null,
      borrador,
    });
    return "No hay pacientes parecidos.";
  }
  if (pacientes.length > 1) {
    return ofrecerLista({ telefono, doctor, borrador, pacientes });
  }
  const pacienteId = pacientes[0].id;
  const mismo = conversacion?.paciente_id === pacienteId;
  return abrirConPaciente({
    telefono,
    doctor,
    borrador,
    pacienteId,
    diagnosticoId: mismo ? conversacion.diagnostico_id : null,
    etiqueta: etiquetaPaciente(pacientes[0]),
  });
};

const publicarTurno = async ({ telefono, doctor, turno, conversacion }) => {
  const invalido = validarTurno(turno);
  if (invalido) return invalido;
  const preparado = await prepararBorrador(turno);
  if (preparado.error) return preparado.error;
  const borrador = preparado.borrador;

  if (!turno.pacienteNombre && conversacion?.paciente_id) {
    return abrirConPaciente({
      telefono,
      doctor,
      borrador,
      pacienteId: conversacion.paciente_id,
      diagnosticoId: conversacion.diagnostico_id || null,
      etiqueta: await etiquetaPorId(conversacion.paciente_id),
    });
  }
  if (!turno.pacienteNombre) {
    return pedirPaciente({ telefono, doctor, borrador });
  }
  return resolverNombre({
    telefono,
    doctor,
    borrador,
    conversacion,
    nombre: turno.pacienteNombre,
  });
};

const tomarRecordatorios = async (doctorId) => {
  const lista = await pool.query(
    `UPDATE recordatorio
     SET estado = 'entregado'
     WHERE doctor_id = $1
       AND estado = 'pendiente'
       AND fecha <= (timezone('America/Mexico_City', now()))::date
     RETURNING texto, to_char(fecha, 'YYYY-MM-DD') AS fecha`,
    [doctorId]
  );
  if (lista.rows.length === 0) return "";
  const lineas = ["Recordatorios:"];
  lista.rows.forEach((item) => lineas.push(`- ${item.fecha}: ${item.texto}`));
  return `${lineas.join("\n")}\n\n`;
};

const elegirNumero = async ({ telefono, doctor, conversacion, texto }) => {
  const candidatos = conversacion.borrador?.candidatos || [];
  const elegido = candidatos[Number(texto) - 1];
  if (!elegido) return listaPacientes(candidatos);
  return abrirConPaciente({
    telefono,
    doctor,
    borrador: conversacion.borrador,
    pacienteId: elegido.id,
    diagnosticoId: null,
    etiqueta: elegido.nombre,
  });
};

const descartar = async (conversacion) => {
  if (conversacion.paciente_id) {
    await guardar({
      telefono: conversacion.telefono,
      doctorId: conversacion.doctor_id,
      estado: "en_consulta",
      pacienteId: conversacion.paciente_id,
      diagnosticoId: conversacion.diagnostico_id,
      borrador: null,
    });
    return "Listo. No guardé este borrador.";
  }
  await borrarConversacion(conversacion.telefono);
  return "Listo. No guardé nada.";
};

const handleWhatsapp = async ({ telefono, doctor, body, mediaUrl, mediaType }) => {
  const avisos = await tomarRecordatorios(doctor.id);
  const texto = String(body || "").trim();
  const conversacion = await getConversacion(telefono);

  let contenido = texto;
  if (mediaUrl) {
    if (mediaType && !mediaType.startsWith("audio/")) {
      return `${avisos}Envía una nota de voz.`;
    }
    const { audioBuffer, contentType } = await downloadMedia(mediaUrl);
    contenido = await speechToText(audioBuffer, contentType);
  } else if (conversacion?.estado === "elegir_paciente") {
    return avisos + (await elegirNumero({ telefono, doctor, conversacion, texto }));
  } else if (conversacion?.estado === "revisar" && texto === "1") {
    const resultado = await confirmarBorrador(telefono);
    if (!resultado.ok) {
      return `${avisos}Todavía no hay nada listo para guardar. Dicta la nota y elige al paciente.`;
    }
    return avisos + resultado.mensaje;
  } else if (conversacion?.estado === "revisar" && texto === "2") {
    return avisos + (await descartar(conversacion));
  } else if (conversacion?.estado === "identificar_paciente" && texto && conversacion.borrador) {
    return avisos + (await resolverNombre({
      telefono,
      doctor,
      borrador: conversacion.borrador,
      conversacion,
      nombre: texto,
    }));
  }

  if (!contenido) {
    return `${avisos}Envía una nota de voz con lo que quieres registrar.`;
  }

  const turno = await clasificarIntencion(contenido);
  return avisos + (await publicarTurno({ telefono, doctor, turno, conversacion }));
};

module.exports = {
  handleWhatsapp,
  mensajeError,
  resumenTurno,
};
