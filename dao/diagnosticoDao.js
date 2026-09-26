const pool = require("./dbConnections");
const { crearOdontogramaDeDiagnostico } = require("../services/whatsapp/odontogramaDiagnostico");

const asegurarOdontograma = async (row) => {
  if (row.odontograma_id) {
    return row;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bloqueado = await client.query(
      `SELECT id FROM diagnostico_clinico
       WHERE id = $1 AND odontograma_id IS NULL
       FOR UPDATE`,
      [row.id]
    );
    if (!bloqueado.rows[0]) {
      const actual = await client.query(
        "SELECT odontograma_id FROM diagnostico_clinico WHERE id = $1",
        [row.id]
      );
      await client.query("COMMIT");
      row.odontograma_id = actual.rows[0]?.odontograma_id || null;
      return row;
    }
    const odontogramaId = await crearOdontogramaDeDiagnostico(client, {
      pacienteId: row.paciente_id,
      nombre: row.nombre,
      piezas: row.piezas_dentales,
    });
    await client.query(
      "UPDATE diagnostico_clinico SET odontograma_id = $1 WHERE id = $2",
      [odontogramaId, row.id]
    );
    await client.query("COMMIT");
    row.odontograma_id = odontogramaId;
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getDiagnosticosByPacienteIdDao = async (pacienteId) => {
  const query = `
    SELECT
      dc.id,
      dc.paciente_id,
      dc.created_at,
      dc.nombre,
      dc.certeza,
      dc.piezas_dentales,
      dc.requiere_revision_pieza,
      dc.transcripcion,
      dc.observaciones,
      dc.odontograma_id,
      trim(concat_ws(' ', d.nombre, d.apellido_paterno, d.apellido_materno)) AS medico
    FROM diagnostico_clinico dc
    JOIN doctores d ON d.id = dc.doctor_id
    WHERE dc.paciente_id = $1
    ORDER BY dc.created_at DESC
  `;
  const result = await pool.query(query, [pacienteId]);
  for (const row of result.rows) {
    await asegurarOdontograma(row);
  }
  return result.rows;
};

module.exports = { getDiagnosticosByPacienteIdDao };
