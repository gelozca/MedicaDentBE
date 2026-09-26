const pool = require("./dbConnections");

const getDiagnosticosByPacienteIdDao = async (pacienteId) => {
  const query = `
    SELECT
      dc.id,
      dc.created_at,
      dc.nombre,
      dc.certeza,
      dc.piezas_dentales,
      dc.requiere_revision_pieza,
      dc.transcripcion,
      dc.observaciones,
      trim(concat_ws(' ', d.nombre, d.apellido_paterno, d.apellido_materno)) AS medico
    FROM diagnostico_clinico dc
    JOIN doctores d ON d.id = dc.doctor_id
    WHERE dc.paciente_id = $1
    ORDER BY dc.created_at DESC
  `;
  const result = await pool.query(query, [pacienteId]);
  return result.rows;
};

module.exports = { getDiagnosticosByPacienteIdDao };
