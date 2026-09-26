const { resumenDiagnostico } = require("./diagnostico");
const { speechToText } = require("./speechToText");
const { interpretDiagnosis } = require("./interpretDiagnosis");
const { downloadMedia } = require("./twilioClient");
const {
  buscarPacientes,
  getConversacion,
  guardarConversacion,
  borrarConversacion,
  confirmarDiagnostico,
  etiquetaPaciente,
  etiquetaPorId,
} = require("./conversacion");

const mensajeError = (error) => {
  if (error.code === "config") {
    return "El servicio de voz todavía no está configurado en el servidor.";
  }
  if (error.code === "empty") {
    return "No se entendió el audio. Dicta la nota otra vez.";
  }
  if (error.code === "upload") {
    return "No pude recibir el audio. Intenta enviarlo de nuevo.";
  }
  if (error.code === "invalid") {
    return "No pude interpretar la nota. Dictala de nuevo.";
  }
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

const sinPacientesParecidos = async ({ telefono, doctor, borrador }) => {
  await guardarConversacion({
    telefono,
    doctorId: doctor.id,
    estado: "identificar_paciente",
    borrador,
  });
  return "No hay pacientes parecidos.";
};

const publicarBorrador = async ({ telefono, doctor, transcripcion, diagnostico, pacienteId }) => {
  const borrador = { transcripcion, ...diagnostico };

  if (!diagnostico.nombre) {
    await guardarConversacion({
      telefono,
      doctorId: doctor.id,
      estado: "identificar_paciente",
      pacienteId,
      borrador,
    });
    return "No escuché un diagnóstico. Dilo de nuevo, por ejemplo: caries en el 46, presuntiva.";
  }

  if (pacienteId) {
    await guardarConversacion({
      telefono,
      doctorId: doctor.id,
      estado: "revisar",
      pacienteId,
      borrador,
    });
    return resumenDiagnostico(borrador, await etiquetaPorId(pacienteId));
  }

  const pacientes = diagnostico.pacienteNombre
    ? await buscarPacientes(diagnostico.pacienteNombre)
    : [];

  if (pacientes.length === 1) {
    await guardarConversacion({
      telefono,
      doctorId: doctor.id,
      estado: "revisar",
      pacienteId: pacientes[0].id,
      borrador,
    });
    return resumenDiagnostico(borrador, etiquetaPaciente(pacientes[0]));
  }

  if (pacientes.length > 1) {
    await guardarConversacion({
      telefono,
      doctorId: doctor.id,
      estado: "elegir_paciente",
      borrador: {
        ...borrador,
        candidatos: pacientes.map((paciente) => ({
          id: paciente.id,
          nombre: etiquetaPaciente(paciente),
        })),
      },
    });
    return listaPacientes(pacientes);
  }

  return sinPacientesParecidos({ telefono, doctor, borrador });
};

const handleWhatsapp = async ({ telefono, doctor, body, mediaUrl, mediaType }) => {
  const texto = String(body || "").trim();
  const conversacion = await getConversacion(telefono);

  if (mediaUrl) {
    if (mediaType && !mediaType.startsWith("audio/")) {
      return "Envía una nota de voz con el diagnóstico.";
    }
    const { audioBuffer, contentType } = await downloadMedia(mediaUrl);
    const transcripcion = await speechToText(audioBuffer, contentType);
    return publicarBorrador({
      telefono,
      doctor,
      transcripcion,
      diagnostico: await interpretDiagnosis(transcripcion),
      pacienteId: conversacion?.paciente_id || null,
    });
  }

  if (!conversacion) {
    return "Envía una nota de voz con el diagnóstico del paciente.";
  }

  if (conversacion.estado === "elegir_paciente") {
    const candidatos = conversacion.borrador?.candidatos || [];
    const elegido = candidatos[Number(texto) - 1];
    if (!elegido) {
      return listaPacientes(candidatos);
    }
    await guardarConversacion({
      telefono,
      doctorId: doctor.id,
      estado: "revisar",
      pacienteId: elegido.id,
      borrador: conversacion.borrador,
    });
    return resumenDiagnostico(conversacion.borrador, elegido.nombre);
  }

  if (conversacion.estado === "revisar" && texto === "1") {
    const resultado = await confirmarDiagnostico(telefono);
    if (!resultado.ok) {
      return "Todavía no hay un diagnóstico listo para guardar. Dicta la nota y elige al paciente.";
    }
    return "Diagnóstico guardado.";
  }

  if (conversacion.estado === "revisar" && texto === "2") {
    await borrarConversacion(telefono);
    return "Listo. No guardé el diagnóstico.";
  }

  if (conversacion.estado === "identificar_paciente" && conversacion.borrador?.nombre) {
    const pacientes = await buscarPacientes(texto);
    if (pacientes.length === 0) {
      return "No hay pacientes parecidos.";
    }
    if (pacientes.length > 1) {
      await guardarConversacion({
        telefono,
        doctorId: doctor.id,
        estado: "elegir_paciente",
        borrador: {
          ...conversacion.borrador,
          candidatos: pacientes.map((paciente) => ({
            id: paciente.id,
            nombre: etiquetaPaciente(paciente),
          })),
        },
      });
      return listaPacientes(pacientes);
    }
    await guardarConversacion({
      telefono,
      doctorId: doctor.id,
      estado: "revisar",
      pacienteId: pacientes[0].id,
      borrador: conversacion.borrador,
    });
    return resumenDiagnostico(conversacion.borrador, etiquetaPaciente(pacientes[0]));
  }

  if (!texto) {
    return "Envía una nota de voz con el diagnóstico del paciente.";
  }

  return publicarBorrador({
    telefono,
    doctor,
    transcripcion: texto,
    diagnostico: await interpretDiagnosis(texto),
    pacienteId: conversacion.paciente_id || null,
  });
};

module.exports = {
  handleWhatsapp,
  mensajeError,
};
