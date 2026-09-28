const colorDePieza = (nombre) =>
  /caries/i.test(String(nombre || "")) ? "#ff0000" : "#ffa500";

const piezasValidas = (piezas) =>
  (Array.isArray(piezas) ? piezas : [])
    .map((pieza) => String(pieza).trim())
    .filter((pieza) => /^\d{2}$/.test(pieza));

const crearOdontogramaDeDiagnostico = async (client, { pacienteId, nombre, piezas, tratamiento }) => {
  const creado = await client.query(
    `INSERT INTO odontograma (paciente_id, fecha_odontograma, tipo)
     VALUES ($1, NOW(), 'diagnostico')
     RETURNING id`,
    [pacienteId]
  );
  const odontogramaId = creado.rows[0].id;
  const lista = piezasValidas(piezas);
  if (lista.length > 0) {
    const color = colorDePieza(nombre);
    const titulo = String(nombre || "Diagnóstico").slice(0, 100);
    const plan = String(tratamiento || "").slice(0, 100);
    for (const pieza of lista) {
      await client.query(
        `INSERT INTO odontograma_diente
           (odontograma_id, num_diente, diagnostico, tratamiento, st0, st1, st2, st3, st4)
         VALUES ($1, $2, $3, $4, $5, $5, $5, $5, $5)`,
        [odontogramaId, pieza, titulo, plan, color]
      );
    }
  }
  return odontogramaId;
};

module.exports = { crearOdontogramaDeDiagnostico };
