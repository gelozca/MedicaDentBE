const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");
const {
  createOdontograma,
  getOdontogramaByPacienteId,
  createOdontogramaDiente,
  getOdontogramaDienteByOdontogramaId,
  updateOdontogramaDienteById,
  deleteOdontogramaById,
  getDienteById,
} = require("../controllers/odontograma-controller");

const router = express.Router();

router.use(checkAuth);

router.post("/", createOdontograma);

router.get("/:id", getOdontogramaByPacienteId);

router.post("/dientes", createOdontogramaDiente);

router.get("/dientes/:id", getOdontogramaDienteByOdontogramaId);

router.get("/dientes/:id/diente", getDienteById);

router.patch("/dientes/diente/:id", updateOdontogramaDienteById);

router.delete("/:id", deleteOdontogramaById);

module.exports = router;
