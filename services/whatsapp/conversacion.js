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

const buscarPacientes = async (texto) => {
  const nombre = String(texto || "").trim();
  if (nombre.length < 2) {
    return [];
  }
  const result = await pool.query(
    `SELECT id, nombre, apellido_paterno, apellido_materno
     FROM pacientes
     WHERE concat_ws(' ', nombre, apellido_paterno, apellido_materno) ILIKE $1
     ORDER BY apellido_paterno, nombre
     LIMIT 8`,
    [`%${nombre}%`]
  );
  return result.rows;
};

const getConversacion = async (telefono) => {
  const result = await pool.query(
    `SELECT * FROM whatsapp_conversacion
     WHERE telefono = $1 AND expira_en > NOW()`,
    [telefono]
  );
  return result.rows[0] || null;
};

const guardarConversacion = async ({ telefono, doctorId, estado, pacienteId, borrador }) => {
  const result = await pool.query(
    `INSERT INTO whatsapp_conversacion
       (telefono, doctor_id, estado, paciente_id, borrador, expira_en, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW() + make_interval(mins => $6), NOW())
     ON CONFLICT (telefono) DO UPDATE SET
       doctor_id = EXCLUDED.doctor_id,
       estado = EXCLUDED.estado,
       paciente_id = EXCLUDED.paciente_id,
       borrador = EXCLUDED.borrador,
       expira_en = EXCLUDED.expira_en,
       updated_at = NOW()
     RETURNING *`,
    [telefono, doctorId, estado, pacienteId || null, borrador ? JSON.stringify(borrador) : null, CONVERSATION_MINUTES]
  );
  return result.rows[0];
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

const confirmarDiagnostico = async (telefono) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const actual = await client.query(
      `SELECT * FROM whatsapp_conversacion
       WHERE telefono = $1 AND estado = 'revisar' AND expira_en > NOW()
       FOR UPDATE`,
      [telefono]
    );
    const conversacion = actual.rows[0];
    if (!conversacion) {
      await client.query("ROLLBACK");
      return { ok: false, motivo: "sin_borrador" };
    }

    const borrador = conversacion.borrador || {};
    if (!conversacion.paciente_id || !borrador.nombre) {
      await client.query("ROLLBACK");
      return { ok: false, motivo: "incompleto" };
    }

    const guardado = await client.query(
      `INSERT INTO diagnostico_clinico
         (paciente_id, doctor_id, transcripcion, nombre, certeza, piezas_dentales,
          requiere_revision_pieza, observaciones, origen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'whatsapp')
       RETURNING id`,
      [
        conversacion.paciente_id,
        conversacion.doctor_id,
        borrador.transcripcion || "",
        borrador.nombre,
        borrador.certeza || "no_especificado",
        borrador.piezasDentales || [],
        Boolean(borrador.requiereRevisionPieza),
        borrador.observaciones || null,
      ]
    );
    await client.query("DELETE FROM whatsapp_conversacion WHERE telefono = $1", [telefono]);
    await client.query("COMMIT");
    return { ok: true, id: guardado.rows[0].id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const etiquetaPaciente = (paciente) => nombreCompleto(paciente);

module.exports = {
  findDoctorByPhone,
  buscarPacientes,
  getConversacion,
  guardarConversacion,
  borrarConversacion,
  confirmarDiagnostico,
  etiquetaPaciente,
  etiquetaPorId,
};
