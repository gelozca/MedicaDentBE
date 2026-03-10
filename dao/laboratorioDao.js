const pool = require("./dbConnections");

// ---------- Doctor/Clínica ----------
const getAllDoctoresClinicaDao = async () => {
  const result = await pool.query(
    "SELECT id, nombre, direccion, telefono, correo, activo, fecha_creacion FROM doctor_clinica WHERE activo = true ORDER BY nombre"
  );
  return result.rows;
};

const getDoctorClinicaByIdDao = async (id) => {
  const result = await pool.query("SELECT * FROM doctor_clinica WHERE id = $1", [id]);
  return result.rows[0];
};

const createDoctorClinicaDao = async (data) => {
  const { nombre, direccion, telefono, correo } = data;
  const result = await pool.query(
    `INSERT INTO doctor_clinica (nombre, direccion, telefono, correo)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [nombre || null, direccion || null, telefono, correo]
  );
  return result.rows[0];
};

const updateDoctorClinicaDao = async (id, data) => {
  const { nombre, direccion, telefono, correo, activo } = data;
  const result = await pool.query(
    `UPDATE doctor_clinica SET nombre = COALESCE($1, nombre), direccion = $2, telefono = $3, correo = $4, activo = COALESCE($5, activo)
     WHERE id = $6 RETURNING *`,
    [nombre, direccion, telefono, correo, activo, id]
  );
  return result.rows[0];
};

// ---------- Estatus ----------
const getAllEstatusDao = async () => {
  const result = await pool.query(
    `SELECT id, codigo, nombre, padre_id, orden_secuencia
     FROM orden_trabajo_estatus ORDER BY orden_secuencia, nombre`
  );
  return result.rows;
};

const getEstatusByCodigoDao = async (codigo) => {
  const result = await pool.query("SELECT * FROM orden_trabajo_estatus WHERE codigo = $1", [codigo]);
  return result.rows[0];
};

// ---------- Órdenes de trabajo ----------
const getOrdenesDao = async (filters = {}) => {
  const { soloNoCerradas, doctorClinicaId, estatusId, search } = filters;
  let query = `
    SELECT ot.*,
           dc.nombre AS doctor_clinica_nombre, dc.telefono AS doctor_clinica_telefono, dc.correo AS doctor_clinica_correo,
           e.codigo AS estatus_codigo, e.nombre AS estatus_nombre, e.padre_id AS estatus_padre_id,
           ep.nombre AS estatus_padre_nombre
    FROM orden_trabajo ot
    JOIN doctor_clinica dc ON dc.id = ot.doctor_clinica_id
    JOIN orden_trabajo_estatus e ON e.id = ot.estatus_actual_id
    LEFT JOIN orden_trabajo_estatus ep ON ep.id = e.padre_id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (soloNoCerradas === true) {
    query += ` AND e.codigo != 'ENVIADO' `;
  }
  if (doctorClinicaId) {
    query += ` AND ot.doctor_clinica_id = $${idx} `;
    params.push(doctorClinicaId);
    idx++;
  }
  if (estatusId) {
    query += ` AND ot.estatus_actual_id = $${idx} `;
    params.push(estatusId);
    idx++;
  }
  if (search && search.trim()) {
    query += ` AND (
      ot.no_orden ILIKE $${idx} OR ot.numero_orden::text = $${idx} OR
      ot.paciente ILIKE $${idx} OR dc.nombre ILIKE $${idx} OR dc.correo ILIKE $${idx}
    ) `;
    params.push(`%${search.trim()}%`);
    idx++;
  }

  query += ` ORDER BY ot.fecha_creacion DESC, ot.numero_orden DESC `;
  const result = await pool.query(query, params);
  return result.rows;
};

const getOrdenByIdDao = async (id) => {
  const result = await pool.query(
    `SELECT ot.*,
            dc.nombre AS doctor_clinica_nombre, dc.direccion AS doctor_clinica_direccion,
            dc.telefono AS doctor_clinica_telefono, dc.correo AS doctor_clinica_correo,
            e.codigo AS estatus_codigo, e.nombre AS estatus_nombre, e.padre_id AS estatus_padre_id,
            ep.nombre AS estatus_padre_nombre
     FROM orden_trabajo ot
     JOIN doctor_clinica dc ON dc.id = ot.doctor_clinica_id
     JOIN orden_trabajo_estatus e ON e.id = ot.estatus_actual_id
     LEFT JOIN orden_trabajo_estatus ep ON ep.id = e.padre_id
     WHERE ot.id = $1`,
    [id]
  );
  return result.rows[0];
};

const getOrdenByCodigoTrackingDao = async (codigoTracking) => {
  const result = await pool.query(
    `SELECT ot.*, e.nombre AS estatus_nombre, ep.nombre AS estatus_padre_nombre
     FROM orden_trabajo ot
     JOIN orden_trabajo_estatus e ON e.id = ot.estatus_actual_id
     LEFT JOIN orden_trabajo_estatus ep ON ep.id = e.padre_id
     WHERE ot.codigo_tracking = $1`,
    [codigoTracking]
  );
  return result.rows[0];
};

const getNextNumeroOrdenDao = async () => {
  const result = await pool.query("SELECT nextval('orden_trabajo_numero_orden_seq') AS next_val");
  return result.rows[0].next_val;
};

const createOrdenDao = async (data) => {
  const noOrdenProvided = data.no_orden !== undefined && data.no_orden !== null && String(data.no_orden).trim() !== "";
  const noOrden = noOrdenProvided ? String(data.no_orden).trim() : "PENDIENTE";

  const fields = [
    "doctor_clinica_id",
    "estatus_actual_id",
    "no_orden",
    "fecha_entrada",
    "fecha_entrega",
    "paciente",
    "edad",
    "sexo",
    "ocurre",
    "envio_consultorio",
    "impresion_analogica",
    "impresion_digital",
    "antagonista_sup",
    "antagonista_inf",
    "registro_mordida_analogico",
    "registro_mordida_digital",
    "color_sustrato",
    "color",
    "colorimetro",
    "fotos_si",
    "prototipo_si",
    "material_zirconia_mono",
    "material_zirconia_estra",
    "material_emax",
    "material_pmma_mono",
    "material_pmma_estra",
    "material_ferula",
    "material_encerado",
    "material_guia_qx",
    "marca",
    "implantes_diametro",
    "aditamentos_enviados",
    "observaciones",
    "total",
    "anticipo",
  ];
  const values = [];
  const placeholders = [];
  let i = 1;
  fields.forEach((f) => {
    placeholders.push(`$${i}`);
    if (f === "no_orden") {
      values.push(noOrden);
    } else {
      values.push(data[f] !== undefined && data[f] !== null && data[f] !== "" ? data[f] : null);
    }
    i++;
  });

  const result = await pool.query(
    `INSERT INTO orden_trabajo (${fields.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
    values
  );
  const orden = result.rows[0];

  await pool.query(
    `INSERT INTO orden_trabajo_historial_estatus (orden_trabajo_id, estatus_id) VALUES ($1, $2)`,
    [orden.id, orden.estatus_actual_id]
  );

  if (!noOrdenProvided) {
    await pool.query("UPDATE orden_trabajo SET no_orden = $1 WHERE id = $2", [String(orden.numero_orden), orden.id]);
    orden.no_orden = String(orden.numero_orden);
  }
  return orden;
};

const updateOrdenDao = async (id, data) => {
  const allowed = [
    "no_orden", "fecha_entrada", "fecha_entrega", "paciente", "edad", "sexo", "ocurre", "envio_consultorio",
    "impresion_analogica", "impresion_digital", "antagonista_sup", "antagonista_inf",
    "registro_mordida_analogico", "registro_mordida_digital", "color_sustrato", "color", "colorimetro",
    "fotos_si", "prototipo_si", "material_zirconia_mono", "material_zirconia_estra", "material_emax",
    "material_pmma_mono", "material_pmma_estra", "material_ferula", "material_encerado", "material_guia_qx",
    "marca", "implantes_diametro", "aditamentos_enviados", "observaciones", "total", "anticipo",
  ];
  const setClause = [];
  const values = [];
  let idx = 1;
  allowed.forEach((f) => {
    if (data[f] !== undefined) {
      setClause.push(`${f} = $${idx}`);
      values.push(data[f]);
      idx++;
    }
  });
  if (setClause.length === 0) return await getOrdenByIdDao(id);
  setClause.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
  values.push(id);
  const result = await pool.query(
    `UPDATE orden_trabajo SET ${setClause.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
};

const updateEstatusOrdenDao = async (ordenId, estatusId, notas = null) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE orden_trabajo SET estatus_actual_id = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2",
      [estatusId, ordenId]
    );
    await client.query(
      "INSERT INTO orden_trabajo_historial_estatus (orden_trabajo_id, estatus_id, notas) VALUES ($1, $2, $3)",
      [ordenId, estatusId, notas]
    );
    const orden = await client.query(
      `SELECT ot.*, e.nombre AS estatus_nombre, ep.nombre AS estatus_padre_nombre
       FROM orden_trabajo ot
       JOIN orden_trabajo_estatus e ON e.id = ot.estatus_actual_id
       LEFT JOIN orden_trabajo_estatus ep ON ep.id = e.padre_id
       WHERE ot.id = $1`,
      [ordenId]
    );
    await client.query("COMMIT");
    return orden.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const getHistorialEstatusByOrdenIdDao = async (ordenId) => {
  const result = await pool.query(
    `SELECT h.*, e.nombre AS estatus_nombre, e.codigo AS estatus_codigo
     FROM orden_trabajo_historial_estatus h
     JOIN orden_trabajo_estatus e ON e.id = h.estatus_id
     WHERE h.orden_trabajo_id = $1 ORDER BY h.fecha_cambio ASC`,
    [ordenId]
  );
  return result.rows;
};

// ---------- Acceso público cliente (consulta por correo/teléfono o por token) ----------
/** Busca doctor_clinica por correo o por teléfono (normalizado a dígitos). Al menos uno debe venir. */
const findDoctorClinicaByCorreoOrTelefonoDao = async ({ correo, telefonoDigitos }) => {
  if (!correo && !telefonoDigitos) return null;
  let query = `
    SELECT id, nombre, correo, telefono FROM doctor_clinica
    WHERE activo = true AND (
  `;
  const params = [];
  const conditions = [];
  if (correo) {
    conditions.push(`LOWER(TRIM(correo)) = LOWER(TRIM($${params.length + 1}))`);
    params.push(correo);
  }
  if (telefonoDigitos) {
    conditions.push(`REGEXP_REPLACE(telefono, '[^0-9]', '', 'g') = $${params.length + 1}`);
    params.push(telefonoDigitos);
  }
  query += conditions.join(" OR ") + ") LIMIT 1";
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

/** Crea un token de acceso temporal para un doctor_clinica. diasVigencia por defecto 15.
 *  Desactiva (activo = false) los enlaces anteriores del mismo doctor_clinica para que solo funcione el nuevo. */
const createAccesoClienteDao = async (doctorClinicaId, diasVigencia = 15) => {
  await pool.query(
    `UPDATE laboratorio_acceso_cliente SET activo = false WHERE doctor_clinica_id = $1`,
    [doctorClinicaId]
  );
  const result = await pool.query(
    `INSERT INTO laboratorio_acceso_cliente (doctor_clinica_id, fecha_expiracion)
     VALUES ($1, CURRENT_TIMESTAMP + ($2 || ' days')::interval)
     RETURNING *`,
    [doctorClinicaId, String(diasVigencia)]
  );
  return result.rows[0];
};

/** Devuelve el registro de acceso si el token es válido, está activo y no ha expirado. */
const findAccesoClienteByTokenDao = async (token) => {
  const result = await pool.query(
    `SELECT * FROM laboratorio_acceso_cliente
     WHERE token = $1 AND activo = true AND fecha_expiracion > CURRENT_TIMESTAMP`,
    [token]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllDoctoresClinicaDao,
  getDoctorClinicaByIdDao,
  createDoctorClinicaDao,
  updateDoctorClinicaDao,
  getAllEstatusDao,
  getEstatusByCodigoDao,
  getOrdenesDao,
  getOrdenByIdDao,
  getOrdenByCodigoTrackingDao,
  getNextNumeroOrdenDao,
  createOrdenDao,
  updateOrdenDao,
  updateEstatusOrdenDao,
  getHistorialEstatusByOrdenIdDao,
  findDoctorClinicaByCorreoOrTelefonoDao,
  createAccesoClienteDao,
  findAccesoClienteByTokenDao,
};
