const pool = require("./dbConnections");

const getDoctorIdByUsuario = async (usuarioId) => {
  const result = await pool.query("SELECT id FROM doctores WHERE usuario_id = $1", [usuarioId]);
  return result.rows[0]?.id || null;
};

const getCitasDelDoctor = async (doctorId) => {
  const result = await pool.query(
    `SELECT c.id,
            to_char(c.fecha, 'YYYY-MM-DD') AS fecha,
            to_char(c.hora, 'HH24:MI') AS hora,
            c.motivo,
            trim(concat_ws(' ', p.nombre, p.apellido_paterno, p.apellido_materno)) AS paciente
     FROM cita c
     JOIN pacientes p ON p.id = c.paciente_id
     WHERE c.doctor_id = $1
       AND c.estado = 'programada'
       AND c.fecha >= (timezone('America/Mexico_City', now()))::date
     ORDER BY c.fecha, c.hora NULLS LAST
     LIMIT 30`,
    [doctorId]
  );
  return result.rows;
};

const cancelarCita = async (doctorId, citaId) => {
  const result = await pool.query(
    `UPDATE cita SET estado = 'cancelada'
     WHERE id = $1 AND doctor_id = $2 AND estado = 'programada'
     RETURNING id`,
    [citaId, doctorId]
  );
  return result.rows[0] || null;
};

const getRecordatoriosVencidos = async (doctorId) => {
  const result = await pool.query(
    `SELECT r.id,
            r.texto,
            to_char(r.fecha, 'YYYY-MM-DD') AS fecha,
            trim(concat_ws(' ', p.nombre, p.apellido_paterno, p.apellido_materno)) AS paciente
     FROM recordatorio r
     LEFT JOIN pacientes p ON p.id = r.paciente_id
     WHERE r.doctor_id = $1
       AND r.estado = 'pendiente'
       AND r.fecha <= (timezone('America/Mexico_City', now()))::date
     ORDER BY r.fecha`,
    [doctorId]
  );
  return result.rows;
};

const getCatalogoPrecios = async () => {
  const result = await pool.query(
    "SELECT id, nombre, alias, precio::float8 AS precio FROM catalogo_precio ORDER BY nombre"
  );
  return result.rows;
};

const actualizarPrecio = async (id, precio) => {
  const result = await pool.query(
    `UPDATE catalogo_precio SET precio = $2
     WHERE id = $1
     RETURNING id, nombre, alias, precio::float8 AS precio`,
    [id, precio]
  );
  return result.rows[0] || null;
};

const crearPresupuesto = async ({ doctorId, pacienteId, diagnosticoId, pieza, descuento, items }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (diagnosticoId) {
      const ligado = await client.query(
        "SELECT id FROM diagnostico_clinico WHERE id = $1 AND paciente_id = $2",
        [diagnosticoId, pacienteId]
      );
      if (!ligado.rows[0]) {
        const error = new Error("diagnostico");
        throw error;
      }
    }
    const lineas = items.map((item) => ({
      concepto: String(item.concepto || "").trim(),
      cantidad: Number(item.cantidad) || 1,
      precio: Number(item.precio) || 0,
      pieza: item.pieza || pieza || null,
    }));
    const subtotal = lineas.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const rebaja = Number(descuento) || 0;
    const total = Math.max(subtotal - rebaja, 0);
    const presupuesto = await client.query(
      `INSERT INTO presupuesto
         (paciente_id, doctor_id, diagnostico_id, pieza, descuento, total, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmado')
       RETURNING id, total::float8 AS total`,
      [pacienteId, doctorId, diagnosticoId || null, pieza || null, rebaja, total]
    );
    for (const linea of lineas) {
      await client.query(
        `INSERT INTO presupuesto_detalle (presupuesto_id, pieza, concepto, cantidad, precio)
         VALUES ($1, $2, $3, $4, $5)`,
        [presupuesto.rows[0].id, linea.pieza, linea.concepto, linea.cantidad, linea.precio]
      );
    }
    await client.query("COMMIT");
    return presupuesto.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getDoctorIdByUsuario,
  getCitasDelDoctor,
  cancelarCita,
  getRecordatoriosVencidos,
  getCatalogoPrecios,
  actualizarPrecio,
  crearPresupuesto,
};
