const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");
const {
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
} = require("../controllers/laboratorio-controller");

// Público: consulta de estatus por código de tracking (una orden)
router.get("/orden-tracking/:codigoTracking", getOrdenByCodigoTracking);

// Público: órdenes por correo o teléfono (?correo=... o ?telefono=...)
router.get("/publico/ordenes", getOrdenesPublicoPorContacto);
// Público: órdenes por token de enlace temporal
router.get("/publico/ordenes/ver/:token", getOrdenesPublicoPorToken);

router.use(checkAuth);

// Generar enlace de acceso para cliente (vigencia por defecto 15 días)
router.post(
  "/acceso-cliente",
  [check("doctor_clinica_id").isUUID().withMessage("Doctor/Clínica inválido")],
  crearAccesoCliente
);

// Doctor/Clínica
router.get("/doctores-clinica", getDoctoresClinica);
router.get("/doctores-clinica/:id", [check("id").isUUID().withMessage("ID inválido")], getDoctorClinicaById);
router.post(
  "/doctores-clinica",
  [
    check("nombre").not().isEmpty().withMessage("Nombre es requerido"),
    check("telefono").not().isEmpty().withMessage("Teléfono es requerido"),
    check("correo").isEmail().withMessage("Correo inválido"),
  ],
  createDoctorClinica
);
router.patch(
  "/doctores-clinica/:id",
  [check("id").isUUID().withMessage("ID inválido")],
  updateDoctorClinica
);

// Estatus
router.get("/estatus", getEstatus);

// Órdenes
router.get("/ordenes", getOrdenes);
router.get("/ordenes/:id", [check("id").isUUID().withMessage("ID inválido")], getOrdenById);
router.get("/ordenes/:id/historial-estatus", [check("id").isUUID().withMessage("ID inválido")], getHistorialEstatus);
router.post(
  "/ordenes",
  [
    check("doctor_clinica_id").isUUID().withMessage("Doctor/Clínica inválido"),
    check("estatus_actual_id").isUUID().withMessage("Estatus inválido"),
  ],
  createOrden
);
router.patch("/ordenes/:id", [check("id").isUUID().withMessage("ID inválido")], updateOrden);
router.patch(
  "/ordenes/:id/estatus",
  [
    check("id").isUUID().withMessage("ID inválido"),
    check("estatusId").isUUID().withMessage("estatusId inválido"),
  ],
  updateEstatusOrden
);

module.exports = router;
