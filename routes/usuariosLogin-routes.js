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
    check("email").normalizeEmail().isEmail().withMessage("Email invalido"),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Password debe tener al menos 6 caracteres"),
    check("username").not().isEmpty().withMessage("Username es requerido"),
    check("rol_id").isUUID().withMessage("Rol invalido"),
  ],
  createUsuario
);

module.exports = router;
