const express = require("express");
const router = express.Router();
const {
  getAllPacientes,
  getPacienteById,
  createPaciente,
  updatePacienteById,
  deletePacienteById,
  updateFotoPerfilPacienteById,
  getDatosContacto,
} = require("../controllers/pacientes-controller");
const checkAuth = require("../middleware/check-auth");
const { check } = require("express-validator");
const { fileUpload, addS3Key } = require("../middleware/file-upload");



router.get("/datos-contacto", [
  check("num_telefono").not().isEmpty().withMessage("Telefono es requerido"),
  check("correo").isEmail().withMessage("Correo invalido")
], getDatosContacto);

router.post("/", [
  check("nombre").not().isEmpty().withMessage("Nombre es requerido"),
  check("apellido_paterno").not().isEmpty().withMessage("Apellido paterno es requerido"),
  check("apellido_materno").not().isEmpty().withMessage("Apellido materno es requerido"),
  check("sexo").not().isEmpty().withMessage("Sexo es requerido"),
  check("fecha_nacimiento").not().isEmpty().withMessage("Fecha de nacimiento es requerida"),
  check("num_telefono").not().isEmpty().withMessage("Telefono es requerido"),
  check("correo").isEmail().withMessage("Correo invalido")
  
], createPaciente);

router.use(checkAuth);

router.get("/", getAllPacientes);



router.get("/:id", [check("id").isUUID().withMessage("ID invalido")], getPacienteById);



router.patch("/:id",[
  check("id").isUUID().withMessage("ID invalido"),
  check("nombre").not().isEmpty().withMessage("Nombre es requerido"),
  check("apellido_paterno").not().isEmpty().withMessage("Apellido paterno es requerido"),
  check("apellido_materno").not().isEmpty().withMessage("Apellido materno es requerido"),
  check("num_telefono").not().isEmpty().withMessage("Telefono es requerido"),
  check("correo").isEmail().withMessage("Correo invalido")
], updatePacienteById);

router.patch("/:id/fotoPerfil", [
  check("id").isUUID().withMessage("ID invalido"),
], fileUpload.single("fotoPerfil"), addS3Key, updateFotoPerfilPacienteById);


router.delete("/:id", deletePacienteById);

module.exports = router;
