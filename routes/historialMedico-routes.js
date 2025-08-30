const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const { check } = require("express-validator");
const { getHistorialMedicoById, updateHistorialMedicoById } = require("../controllers/historialMedico-controller");


router.get("/:id", check("id").isUUID().withMessage("ID invalido"), getHistorialMedicoById);
router.patch("/:id", check("id").isUUID().withMessage("ID invalido"), updateHistorialMedicoById);

module.exports = router;