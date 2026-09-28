const pool = require("../../dao/dbConnections");
const { DOCTOR_ROL_ID, phonesMatch, nombreCompleto } = require("./diagnostico");
const CONVERSATION_MINUTES = 30;

const findDoctorByPhone = async (incomingPhone) => {
  const doctores = await pool.query(
    `SELECT id, usuario_id, nombre, apellido_paterno, apellido_materno, num_telefono
     FROM doctores
     WHERE num_telefono IS NOT NULL`
  );
  const doctor = doctores.rows.find((row) => phonesMatch(row.num_telefono, incomingPhone));
  if (doctor) {
    return { doctor, motivo: null };
  }

  const personal = await pool.query(
    `SELECT p.usuario_id, p.nombre, p.apellido_paterno, p.apellido_materno, p.num_telefono, u.rol_id
     FROM personal_clinica p
     INNER JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.num_telefono IS NOT NULL`
  );
  const persona = personal.rows.find((row) => phonesMatch(row.num_telefono, incomingPhone));
  if (!persona || persona.rol_id !== DOCTOR_ROL_ID) {
    return { doctor: null, motivo: "no_autorizado" };
  }

  const ligado = await pool.query(
    `SELECT id, usuario_id, nombre, apellido_paterno, apellido_materno, num_telefono
     FROM doctores
     WHERE usuario_id = $1`,
    [persona.usuario_id]
  );
  if (!ligado.rows[0]) {
    return { doctor: null, motivo: "sin_perfil_doctor" };
  }
  return { doctor: ligado.rows[0], motivo: null };
};

const ACENTOS = "áéíóúüñ";
const SIN_ACENTOS = "aeiouun";

const consultaPacientes = async (condicion, params) => {
  const result = await pool.query(
    `SELECT id, nombre, apellido_paterno, apellido_materno
     FROM pacientes
     WHERE ${condicion}
     ORDER BY apellido_paterno, nombre
     LIMIT 8`,
    params
  );
  return result.rows;
};

const coincideNombre = (indiceTexto, indiceAcentos, indiceSin) =>
  `translate(lower(concat_ws(' ', nombre, apellido_paterno, apellido_materno)), $${indiceAcentos}, $${indiceSin})
     LIKE '%' || translate(lower($${indiceTexto}), $${indiceAcentos}, $${indiceSin}) || '%'`;

const buscarPacientes = async (texto) => {
  const nombre = String(texto || "").trim();
  if (nombre.length < 2) {
    return [];
  }
  const exactos = await consultaPacientes(coincideNombre(1, 2, 3), [nombre, ACENTOS, SIN_ACENTOS]);
  if (exactos.length > 0) {
    return exactos;
  }

  const palabras = nombre.split(/\s+/).filter((palabra) => palabra.length >= 2);
  if (palabras.length === 0) {
    return [];
  }
  const condiciones = palabras.map((_, index) => coincideNombre(index + 3, 1, 2)).join(" OR ");
  return consultaPacientes(condiciones, [ACENTOS, SIN_ACENTOS, ...palabras]);
};

const getConversacion = async (telefono) => {
  const result = await pool.query(
    `SELECT * FROM whatsapp_conversacion
     WHERE telefono = $1 AND expira_en > NOW()`,
    [telefono]
  );
  return result.rows[0] || null;
};

const guardarConversacion = async ({ telefono, doctorId, estado, pacienteId, diagnosticoId, borrador }) => {
  const result = await pool.query(
    `INSERT INTO whatsapp_conversacion
       (telefono, doctor_id, estado, paciente_id, diagnostico_id, borrador, expira_en, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW() + make_interval(mins => $7), NOW())
     ON CONFLICT (telefono) DO UPDATE SET
       doctor_id = EXCLUDED.doctor_id,
       estado = EXCLUDED.estado,
       paciente_id = EXCLUDED.paciente_id,
       diagnostico_id = EXCLUDED.diagnostico_id,
       borrador = EXCLUDED.borrador,
       expira_en = EXCLUDED.expira_en,
       updated_at = NOW()
     RETURNING *`,
    [
      telefono,
      doctorId,
      estado,
      pacienteId || null,
      diagnosticoId || null,
      borrador ? JSON.stringify(borrador) : null,
      CONVERSATION_MINUTES,
    ]
  );
  return result.rows[0];
};

const dejarContexto = async (client, { telefono, pacienteId, diagnosticoId }) => {
  await client.query(
    `UPDATE whatsapp_conversacion
     SET estado = 'en_consulta',
         paciente_id = $2,
         diagnostico_id = $3,
         borrador = NULL,
         expira_en = NOW() + make_interval(mins => $4),
         updated_at = NOW()
     WHERE telefono = $1`,
    [telefono, pacienteId || null, diagnosticoId || null, CONVERSATION_MINUTES]
  );
};

const borrarConversacion = async (telefono) => {
  await pool.query("DELETE FROM whatsapp_conversacion WHERE telefono = $1", [telefono]);
};

const etiquetaPorId = async (pacienteId) => {
  const result = await pool.query(
    "SELECT nombre, apellido_paterno, apellido_materno FROM pacientes WHERE id = $1",
    [pacienteId]
  );
  if (!result.rows[0]) {
    return "el paciente seleccionado";
  }
  return nombreCompleto(result.rows[0]);
};

const etiquetaPaciente = (paciente) => nombreCompleto(paciente);

module.exports = {
  findDoctorByPhone,
  buscarPacientes,
  getConversacion,
  guardarConversacion,
  dejarContexto,
  borrarConversacion,
  etiquetaPaciente,
  etiquetaPorId,
};
