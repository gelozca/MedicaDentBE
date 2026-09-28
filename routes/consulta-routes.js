const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");
const {
  getCitas,
  patchCancelarCita,
  getRecordatorios,
  getCatalogo,
  patchPrecio,
  postPresupuesto,
} = require("../controllers/consulta-controller");

const router = express.Router();

router.use(checkAuth);

router.get("/citas", getCitas);
router.patch("/citas/:id/cancelar", [check("id").isUUID()], patchCancelarCita);
router.get("/recordatorios", getRecordatorios);
router.get("/catalogo", getCatalogo);
router.patch(
  "/catalogo/:id",
  [check("id").isUUID(), check("precio").isFloat({ min: 0 })],
  patchPrecio
);
router.post(
  "/presupuestos",
  [
    check("pacienteId").isUUID(),
    check("diagnosticoId").optional({ nullable: true, checkFalsy: true }).isUUID(),
    check("descuento").optional().isFloat({ min: 0 }),
    check("items").isArray({ min: 1 }),
  ],
  postPresupuesto
);

module.exports = router;
