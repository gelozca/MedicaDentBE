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
} = require("../controllers/personalClinica-controller");

router.use(checkAuth);

router.get("/", getPersonalClinica);
router.get("/personal-existente", getPersonalClinicaExistente);
router.get("/:id", getPersonalClinicaById);
router.get("/rol-id/:id", getPersonalClinicaByRolId);

router.post("/", createPersonalClinica);


module.exports = router;
