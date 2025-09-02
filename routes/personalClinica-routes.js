const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const { check } = require("express-validator");
const {
  getPersonalClinica,
  getPersonalClinicaById,
  createPersonalClinica,
  getPersonalClinicaByRolId,
  getPersonalClinicaExistente,
  getPersonalClinicaByUsuarioId
} = require("../controllers/personalClinica-controller");

router.use(checkAuth);

router.get("/", getPersonalClinica);
router.get("/personal-existente", getPersonalClinicaExistente);
router.get("/:id", getPersonalClinicaById);
router.get("/rol-id/:id", getPersonalClinicaByRolId);
router.get("/usuario/:id", getPersonalClinicaByUsuarioId);


router.post("/", createPersonalClinica);


module.exports = router;
