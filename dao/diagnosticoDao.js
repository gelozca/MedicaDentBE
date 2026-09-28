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
      trim(concat_ws(' ', d.nombre, d.apellido_paterno, d.apellido_materno)) AS medico,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', t.id, 'pieza', t.pieza, 'nombre', t.nombre, 'estado', t.estado
        ))
        FROM tratamiento t WHERE t.diagnostico_id = dc.id
      ), '[]'::json) AS tratamientos,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', c.id,
          'fecha', to_char(c.fecha, 'YYYY-MM-DD'),
          'hora', to_char(c.hora, 'HH24:MI'),
          'motivo', c.motivo,
          'estado', c.estado
        ) ORDER BY c.fecha)
        FROM cita c
        WHERE c.diagnostico_id = dc.id AND c.estado = 'programada'
      ), '[]'::json) AS citas,
      (
        SELECT json_build_object(
          'id', p.id,
          'estado', p.estado,
          'total', p.total::float8,
          'pieza', p.pieza,
          'detalles', COALESCE((
            SELECT json_agg(json_build_object(
              'concepto', pd.concepto,
              'precio', pd.precio::float8,
              'cantidad', pd.cantidad,
              'pieza', pd.pieza
            ))
            FROM presupuesto_detalle pd WHERE pd.presupuesto_id = p.id
          ), '[]'::json)
        )
        FROM presupuesto p
        WHERE p.diagnostico_id = dc.id AND p.estado = 'confirmado'
        ORDER BY p.created_at DESC
        LIMIT 1
      ) AS presupuesto,
      (
        SELECT json_build_object(
          'id', r.id,
          'texto', r.texto,
          'medicamentos', COALESCE((
            SELECT json_agg(json_build_object(
              'nombre', m.nombre, 'dosis', m.dosis, 'frecuencia', m.frecuencia, 'duracion', m.duracion
            ))
            FROM receta_medicamento m WHERE m.receta_id = r.id
          ), '[]'::json)
        )
        FROM receta r
        WHERE r.diagnostico_id = dc.id
        ORDER BY r.created_at DESC
        LIMIT 1
      ) AS receta
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
