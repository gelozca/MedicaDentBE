const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const {
  getDoctorIdByUsuario,
  getCitasDelDoctor,
  cancelarCita,
  getRecordatoriosVencidos,
  getCatalogoPrecios,
  actualizarPrecio,
  crearPresupuesto,
} = require("../dao/consultaDao");

const doctorActual = async (req, next) => {
  const doctorId = await getDoctorIdByUsuario(req.userData.id);
  if (!doctorId) {
    next(new HttpError("No hay un perfil de doctor para este usuario", 403));
    return null;
  }
  return doctorId;
};

const getCitas = async (req, res, next) => {
  try {
    const doctorId = await getDoctorIdByUsuario(req.userData.id);
    res.json(doctorId ? await getCitasDelDoctor(doctorId) : []);
  } catch (error) {
    return next(new HttpError("Error al obtener las citas", 500));
  }
};

const patchCancelarCita = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new HttpError("ID invalido", 400));
  try {
    const doctorId = await doctorActual(req, next);
    if (!doctorId) return;
    const cita = await cancelarCita(doctorId, req.params.id);
    if (!cita) return next(new HttpError("Cita no encontrada", 404));
    res.json(cita);
  } catch (error) {
    return next(new HttpError("Error al cancelar la cita", 500));
  }
};

const getRecordatorios = async (req, res, next) => {
  try {
    const doctorId = await getDoctorIdByUsuario(req.userData.id);
    res.json(doctorId ? await getRecordatoriosVencidos(doctorId) : []);
  } catch (error) {
    return next(new HttpError("Error al obtener los recordatorios", 500));
  }
};

const getCatalogo = async (req, res, next) => {
  try {
    res.json(await getCatalogoPrecios());
  } catch (error) {
    return next(new HttpError("Error al obtener el catálogo", 500));
  }
};

const patchPrecio = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new HttpError("Precio invalido", 400));
  try {
    const doctorId = await doctorActual(req, next);
    if (!doctorId) return;
    const actualizado = await actualizarPrecio(req.params.id, Number(req.body.precio));
    if (!actualizado) return next(new HttpError("Precio no encontrado", 404));
    res.json(actualizado);
  } catch (error) {
    return next(new HttpError("Error al actualizar el precio", 500));
  }
};

const postPresupuesto = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new HttpError("Datos invalidos", 400));
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (items.length === 0 || items.some((item) => !String(item.concepto || "").trim())) {
    return next(new HttpError("Agrega al menos un concepto", 400));
  }
  try {
    const doctorId = await doctorActual(req, next);
    if (!doctorId) return;
    const creado = await crearPresupuesto({
      doctorId,
      pacienteId: req.body.pacienteId,
      diagnosticoId: req.body.diagnosticoId || null,
      pieza: req.body.pieza || null,
      descuento: req.body.descuento || 0,
      items,
    });
    res.status(201).json(creado);
  } catch (error) {
    if (error.message === "diagnostico") {
      return next(new HttpError("El diagnóstico no corresponde al paciente", 400));
    }
    return next(new HttpError("Error al guardar el presupuesto", 500));
  }
};

module.exports = {
  getCitas,
  patchCancelarCita,
  getRecordatorios,
  getCatalogo,
  patchPrecio,
  postPresupuesto,
};
