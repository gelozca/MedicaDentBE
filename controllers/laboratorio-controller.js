const HttpError = require("../models/http-error");
const {
  getAllDoctoresClinicaDao,
  getDoctorClinicaByIdDao,
  createDoctorClinicaDao,
  updateDoctorClinicaDao,
  getAllEstatusDao,
  getOrdenesDao,
  getOrdenByIdDao,
  getOrdenByCodigoTrackingDao,
  createOrdenDao,
  updateOrdenDao,
  updateEstatusOrdenDao,
  getHistorialEstatusByOrdenIdDao,
  findDoctorClinicaByCorreoOrTelefonoDao,
  createAccesoClienteDao,
  findAccesoClienteByTokenDao,
} = require("../dao/laboratorioDao");

// ---------- Doctor/Clínica ----------
const getDoctoresClinica = async (req, res, next) => {
  try {
    const list = await getAllDoctoresClinicaDao();
    res.json(list);
  } catch (err) {
    next(new HttpError("Error al obtener doctores/clínicas", 500));
  }
};

const getDoctorClinicaById = async (req, res, next) => {
  try {
    const item = await getDoctorClinicaByIdDao(req.params.id);
    if (!item) return next(new HttpError("Doctor/Clínica no encontrado", 404));
    res.json(item);
  } catch (err) {
    next(new HttpError("Error al obtener doctor/clínica", 500));
  }
};

const createDoctorClinica = async (req, res, next) => {
  try {
    const { nombre, direccion, telefono, correo } = req.body;
    const created = await createDoctorClinicaDao({ nombre, direccion, telefono, correo });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === "23505") return next(new HttpError("Correo o datos ya registrados", 400));
    next(new HttpError(err.message || "Error al crear doctor/clínica", 500));
  }
};

const updateDoctorClinica = async (req, res, next) => {
  try {
    const updated = await updateDoctorClinicaDao(req.params.id, req.body);
    if (!updated) return next(new HttpError("Doctor/Clínica no encontrado", 404));
    res.json(updated);
  } catch (err) {
    next(new HttpError(err.message || "Error al actualizar doctor/clínica", 500));
  }
};

// ---------- Estatus ----------
const getEstatus = async (req, res, next) => {
  try {
    const list = await getAllEstatusDao();
    res.json(list);
  } catch (err) {
    next(new HttpError("Error al obtener estatus", 500));
  }
};

// ---------- Órdenes ----------
const getOrdenes = async (req, res, next) => {
  try {
    const soloNoCerradas = req.query.soloNoCerradas === "true";
    const doctorClinicaId = req.query.doctorClinicaId || null;
    const estatusId = req.query.estatusId || null;
    const search = req.query.search || null;
    const list = await getOrdenesDao({ soloNoCerradas, doctorClinicaId, estatusId, search });
    res.json(list);
  } catch (err) {
    next(new HttpError("Error al obtener órdenes", 500));
  }
};

const getOrdenById = async (req, res, next) => {
  try {
    const orden = await getOrdenByIdDao(req.params.id);
    if (!orden) return next(new HttpError("Orden no encontrada", 404));
    res.json(orden);
  } catch (err) {
    next(new HttpError("Error al obtener orden", 500));
  }
};

const getOrdenByCodigoTracking = async (req, res, next) => {
  try {
    const orden = await getOrdenByCodigoTrackingDao(req.params.codigoTracking);
    if (!orden) return next(new HttpError("Orden no encontrada", 404));
    res.json(orden);
  } catch (err) {
    next(new HttpError("Error al consultar orden", 500));
  }
};

const createOrden = async (req, res, next) => {
  try {
    const created = await createOrdenDao(req.body);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === "23505") return next(new HttpError("Número de orden ya existe", 400));
    if (err.code === "23503") return next(new HttpError("Doctor/Clínica o estatus inválido", 400));
    next(new HttpError(err.message || "Error al crear orden", 500));
  }
};

const updateOrden = async (req, res, next) => {
  try {
    const updated = await updateOrdenDao(req.params.id, req.body);
    if (!updated) return next(new HttpError("Orden no encontrada", 404));
    res.json(updated);
  } catch (err) {
    next(new HttpError(err.message || "Error al actualizar orden", 500));
  }
};

const updateEstatusOrden = async (req, res, next) => {
  try {
    const { estatusId, notas } = req.body;
    if (!estatusId) return next(new HttpError("estatusId es requerido", 400));
    const updated = await updateEstatusOrdenDao(req.params.id, estatusId, notas || null);
    if (!updated) return next(new HttpError("Orden no encontrada", 404));
    res.json(updated);
  } catch (err) {
    next(new HttpError(err.message || "Error al actualizar estatus", 500));
  }
};

const getHistorialEstatus = async (req, res, next) => {
  try {
    const list = await getHistorialEstatusByOrdenIdDao(req.params.id);
    res.json(list);
  } catch (err) {
    next(new HttpError("Error al obtener historial de estatus", 500));
  }
};

// ---------- Acceso público: órdenes por correo/teléfono o por token ----------
/** Normaliza teléfono a solo dígitos para comparar con BD. */
const normalizarTelefono = (valor) => {
  if (valor == null || typeof valor !== "string") return "";
  return valor.replace(/\D/g, "");
};

/** GET público: órdenes por correo o teléfono (al menos uno requerido). */
const getOrdenesPublicoPorContacto = async (req, res, next) => {
  try {
    const correo = req.query.correo ? String(req.query.correo).trim() : null;
    const telefono = req.query.telefono ? normalizarTelefono(req.query.telefono) : null;
    if (!correo && !telefono) {
      return next(new HttpError("Indique correo o teléfono registrado", 400));
    }
    const doctorClinica = await findDoctorClinicaByCorreoOrTelefonoDao({
      correo: correo || undefined,
      telefonoDigitos: telefono || undefined,
    });
    if (!doctorClinica) {
      return next(new HttpError("No se encontró un cliente con ese correo o teléfono", 404));
    }
    const ordenes = await getOrdenesDao({ doctorClinicaId: doctorClinica.id });
    res.json({ doctor_clinica: doctorClinica, ordenes });
  } catch (err) {
    next(new HttpError("Error al consultar órdenes", 500));
  }
};

/** GET público: órdenes por token de enlace temporal (válido y no expirado). */
const getOrdenesPublicoPorToken = async (req, res, next) => {
  try {
    const acceso = await findAccesoClienteByTokenDao(req.params.token);
    if (!acceso) {
      return next(new HttpError("Enlace inválido o expirado", 404));
    }
    const doctorClinica = await getDoctorClinicaByIdDao(acceso.doctor_clinica_id);
    if (!doctorClinica) {
      return next(new HttpError("Cliente no encontrado", 404));
    }
    const ordenes = await getOrdenesDao({ doctorClinicaId: acceso.doctor_clinica_id });
    res.json({
      doctor_clinica: {
        id: doctorClinica.id,
        nombre: doctorClinica.nombre,
        correo: doctorClinica.correo,
        telefono: doctorClinica.telefono,
      },
      ordenes,
      fecha_expiracion: acceso.fecha_expiracion,
    });
  } catch (err) {
    next(new HttpError("Error al consultar órdenes", 500));
  }
};

/** POST (autenticado): genera enlace de acceso temporal para un doctor_clinica. */
const crearAccesoCliente = async (req, res, next) => {
  try {
    const doctorClinicaId = req.body.doctor_clinica_id;
    const diasVigencia = req.body.dias_vigencia != null ? Number(req.body.dias_vigencia) : 15;
    if (!doctorClinicaId) {
      return next(new HttpError("doctor_clinica_id es requerido", 400));
    }
    if (diasVigencia < 1 || diasVigencia > 365) {
      return next(new HttpError("dias_vigencia debe estar entre 1 y 365", 400));
    }
    const acceso = await createAccesoClienteDao(doctorClinicaId, diasVigencia);
    const baseUrl = process.env.FRONTEND_BASE_URL || req.protocol + "://" + req.get("host");
    const pathFront = "/medicadent/estado-orden/ver/" + acceso.token;
    const linkCompleto = baseUrl.replace(/\/$/, "") + pathFront;
    res.status(201).json({
      id: acceso.id,
      token: acceso.token,
      fecha_expiracion: acceso.fecha_expiracion,
      link: linkCompleto,
      path: pathFront,
    });
  } catch (err) {
    if (err.code === "23503") return next(new HttpError("Doctor/Clínica no encontrado", 400));
    next(new HttpError(err.message || "Error al generar enlace", 500));
  }
};

module.exports = {
  getDoctoresClinica,
  getDoctorClinicaById,
  createDoctorClinica,
  updateDoctorClinica,
  getEstatus,
  getOrdenes,
  getOrdenById,
  getOrdenByCodigoTracking,
  createOrden,
  updateOrden,
  updateEstatusOrden,
  getHistorialEstatus,
  getOrdenesPublicoPorContacto,
  getOrdenesPublicoPorToken,
  crearAccesoCliente,
};
