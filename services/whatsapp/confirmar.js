const pool = require("../../dao/dbConnections");
const { dejarContexto } = require("./conversacion");
const { crearOdontogramaDeDiagnostico } = require("./odontogramaDiagnostico");
const { buscarPrecio } = require("./precios");

const FECHA = `(timezone('America/Mexico_City', now()))::date`;

const tomarBorrador = async (client, telefono) => {
  const actual = await client.query(
    `SELECT * FROM whatsapp_conversacion
     WHERE telefono = $1 AND estado = 'revisar' AND expira_en > NOW()
     FOR UPDATE`,
    [telefono]
  );
  return actual.rows[0] || null;
};

const diagnosticoDePieza = async (client, { pacienteId, pieza, diagnosticoId }) => {
  if (pieza) {
    const hallado = await client.query(
      `SELECT id FROM diagnostico_clinico
       WHERE paciente_id = $1 AND $2 = ANY(piezas_dentales)
       ORDER BY created_at DESC
       LIMIT 1`,
      [pacienteId, pieza]
    );
    return hallado.rows[0]?.id || null;
  }
  return diagnosticoId || null;
};

const guardarRegistrar = async (client, conversacion) => {
  const borrador = conversacion.borrador || {};
  if (!borrador.nombre) return { ok: false, motivo: "incompleto" };
  const odontogramaId = await crearOdontogramaDeDiagnostico(client, {
    pacienteId: conversacion.paciente_id,
    nombre: borrador.nombre,
    piezas: borrador.piezasDentales || [],
    tratamiento: borrador.tratamiento,
  });
  const guardado = await client.query(
    `INSERT INTO diagnostico_clinico
       (paciente_id, doctor_id, transcripcion, nombre, certeza, piezas_dentales,
        requiere_revision_pieza, observaciones, origen, odontograma_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'whatsapp', $9)
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
      odontogramaId,
    ]
  );
  const diagnosticoId = guardado.rows[0].id;
  const piezas = Array.isArray(borrador.piezasDentales) && borrador.piezasDentales.length
    ? borrador.piezasDentales
    : [null];
  let tratamientoId = null;
  if (borrador.tratamiento) {
    for (const pieza of piezas) {
      const tratamiento = await client.query(
        `INSERT INTO tratamiento (paciente_id, doctor_id, diagnostico_id, pieza, nombre, estado)
         VALUES ($1, $2, $3, $4, $5, 'pendiente')
         RETURNING id`,
        [conversacion.paciente_id, conversacion.doctor_id, diagnosticoId, pieza, borrador.tratamiento]
      );
      tratamientoId = tratamientoId || tratamiento.rows[0].id;
    }
  }
  let citaFecha = null;
  if (borrador.seguimientoDias !== null && borrador.seguimientoDias !== undefined) {
    const cita = await client.query(
      `INSERT INTO cita (paciente_id, doctor_id, diagnostico_id, tratamiento_id, fecha, motivo, estado)
       VALUES ($1, $2, $3, $4, ${FECHA} + $5::int, $6, 'programada')
       RETURNING to_char(fecha, 'YYYY-MM-DD') AS fecha`,
      [
        conversacion.paciente_id,
        conversacion.doctor_id,
        diagnosticoId,
        tratamientoId,
        borrador.seguimientoDias,
        borrador.tratamiento || "Control",
      ]
    );
    citaFecha = cita.rows[0].fecha;
  }
  await dejarContexto(client, {
    telefono: conversacion.telefono,
    pacienteId: conversacion.paciente_id,
    diagnosticoId,
  });
  const lineas = ["Diagnóstico guardado."];
  if (borrador.tratamiento) lineas.push(`Tratamiento pendiente: ${borrador.tratamiento}.`);
  if (citaFecha) lineas.push(`Control agendado para el ${citaFecha}.`);
  return { ok: true, mensaje: lineas.join("\n") };
};

const guardarAgenda = async (client, conversacion) => {
  const borrador = conversacion.borrador || {};
  if (borrador.seguimientoDias === null || borrador.seguimientoDias === undefined) {
    return { ok: false, motivo: "incompleto" };
  }
  const cita = await client.query(
    `INSERT INTO cita (paciente_id, doctor_id, diagnostico_id, fecha, motivo, estado)
     VALUES ($1, $2, $3, ${FECHA} + $4::int, $5, 'programada')
     RETURNING to_char(fecha, 'YYYY-MM-DD') AS fecha`,
    [
      conversacion.paciente_id,
      conversacion.doctor_id,
      conversacion.diagnostico_id,
      borrador.seguimientoDias,
      borrador.motivo || "Control",
    ]
  );
  await dejarContexto(client, {
    telefono: conversacion.telefono,
    pacienteId: conversacion.paciente_id,
    diagnosticoId: conversacion.diagnostico_id,
  });
  return { ok: true, mensaje: `Cita guardada para el ${cita.rows[0].fecha}.` };
};

const guardarPresupuesto = async (client, conversacion) => {
  const borrador = conversacion.borrador || {};
  if (!borrador.concepto || borrador.precio === null || borrador.precio === undefined) {
    return { ok: false, motivo: "incompleto" };
  }
  const diagnosticoId = await diagnosticoDePieza(client, {
    pacienteId: conversacion.paciente_id,
    pieza: borrador.pieza,
    diagnosticoId: conversacion.diagnostico_id,
  });
  const presupuesto = await client.query(
    `INSERT INTO presupuesto
       (paciente_id, doctor_id, diagnostico_id, pieza, total, estado)
     VALUES ($1, $2, $3, $4, $5, 'confirmado')
     RETURNING id`,
    [
      conversacion.paciente_id,
      conversacion.doctor_id,
      diagnosticoId,
      borrador.pieza || null,
      borrador.precio,
    ]
  );
  await client.query(
    `INSERT INTO presupuesto_detalle (presupuesto_id, pieza, concepto, cantidad, precio)
     VALUES ($1, $2, $3, 1, $4)`,
    [presupuesto.rows[0].id, borrador.pieza || null, borrador.concepto, borrador.precio]
  );
  await dejarContexto(client, {
    telefono: conversacion.telefono,
    pacienteId: conversacion.paciente_id,
    diagnosticoId: diagnosticoId || conversacion.diagnostico_id,
  });
  const aviso = diagnosticoId
    ? "Presupuesto confirmado y ligado al diagnóstico."
    : "Presupuesto confirmado. No hay un diagnóstico de esa pieza para ligarlo.";
  return { ok: true, mensaje: aviso };
};

const guardarReceta = async (client, conversacion) => {
  const borrador = conversacion.borrador || {};
  const medicamentos = Array.isArray(borrador.medicamentos) ? borrador.medicamentos : [];
  if (medicamentos.length === 0) return { ok: false, motivo: "incompleto" };
  const diagnosticoId = await diagnosticoDePieza(client, {
    pacienteId: conversacion.paciente_id,
    pieza: borrador.pieza,
    diagnosticoId: conversacion.diagnostico_id,
  });
  const receta = await client.query(
    `INSERT INTO receta (paciente_id, doctor_id, diagnostico_id, texto)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [conversacion.paciente_id, conversacion.doctor_id, diagnosticoId, borrador.transcripcion || null]
  );
  for (const medicamento of medicamentos) {
    await client.query(
      `INSERT INTO receta_medicamento (receta_id, nombre, dosis, frecuencia, duracion)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        receta.rows[0].id,
        medicamento.nombre,
        medicamento.dosis || null,
        medicamento.frecuencia || null,
        medicamento.duracion || null,
      ]
    );
  }
  await dejarContexto(client, {
    telefono: conversacion.telefono,
    pacienteId: conversacion.paciente_id,
    diagnosticoId: diagnosticoId || conversacion.diagnostico_id,
  });
  const aviso = diagnosticoId
    ? "Receta guardada y ligada al diagnóstico."
    : "Receta guardada en el paciente. No hay un diagnóstico para ligarla.";
  return { ok: true, mensaje: aviso };
};

const guardarRecordatorio = async (client, conversacion) => {
  const borrador = conversacion.borrador || {};
  if (!borrador.texto) return { ok: false, motivo: "incompleto" };
  const dias = borrador.seguimientoDias ?? 0;
  const aviso = await client.query(
    `INSERT INTO recordatorio (doctor_id, paciente_id, texto, fecha, estado)
     VALUES ($1, $2, $3, ${FECHA} + $4::int, 'pendiente')
     RETURNING to_char(fecha, 'YYYY-MM-DD') AS fecha`,
    [conversacion.doctor_id, conversacion.paciente_id, borrador.texto, dias]
  );
  await dejarContexto(client, {
    telefono: conversacion.telefono,
    pacienteId: conversacion.paciente_id,
    diagnosticoId: conversacion.diagnostico_id,
  });
  return {
    ok: true,
    mensaje: `Listo. Te recuerdo: ${borrador.texto}. Fecha: ${aviso.rows[0].fecha}.`,
  };
};

const confirmarBorrador = async (telefono) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const conversacion = await tomarBorrador(client, telefono);
    if (!conversacion?.paciente_id) {
      await client.query("ROLLBACK");
      return { ok: false, motivo: "sin_borrador" };
    }
    const intencion = conversacion.borrador?.intencion || "registrar";
    const acciones = {
      registrar: guardarRegistrar,
      agendar: guardarAgenda,
      presupuesto: guardarPresupuesto,
      receta: guardarReceta,
      recordar: guardarRecordatorio,
    };
    const accion = acciones[intencion];
    if (!accion) {
      await client.query("ROLLBACK");
      return { ok: false, motivo: "incompleto" };
    }
    const resultado = await accion(client, conversacion);
    if (!resultado.ok) {
      await client.query("ROLLBACK");
      return resultado;
    }
    await client.query("COMMIT");
    return resultado;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const precioDeConcepto = async (concepto) => {
  const catalogo = await pool.query("SELECT id, nombre, alias, precio FROM catalogo_precio");
  const hallado = buscarPrecio(catalogo.rows, concepto);
  if (!hallado) return null;
  return { ...hallado, precio: Number(hallado.precio) };
};

module.exports = { confirmarBorrador, precioDeConcepto };
