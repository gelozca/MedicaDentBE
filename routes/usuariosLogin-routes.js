const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();
const {
  createUsuario,
  getAllUsuarios,
  loginUsuario,
  cambiarPassword,
} = require("../controllers/usuariosLogin-controller");

router.post(
  "/login",
  loginUsuario
);

router.patch("/cambiar-password", cambiarPassword);

router.use(checkAuth);

router.get("/", getAllUsuarios);

router.post(
  "/signup",
  [
    check("email").normalizeEmail().isEmail().withMessage("Correo inválido"),
    check("password")
      .isLength({ min: 6 })
      .withMessage("La contraseña debe tener al menos 6 caracteres"),
    check("rol_id").isUUID().withMessage("Rol inválido"),
  ],
  createUsuario
);

module.exports = router;
