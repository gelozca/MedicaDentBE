const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const { fileUpload, addS3Key } = require("../middleware/file-upload");
const {
  requireAdmin,
  getPersonalClinica,
  getPersonalClinicaById,
  createPersonalClinica,
  getPersonalClinicaByRolId,
  getPersonalClinicaExistente,
  getPersonalClinicaByUsuarioId,
  updateMiPerfil,
  updateMiFotoPerfil,
  updatePerfilByUsuarioId,
  updateFotoPerfilPersonalClinica,
  deletePersonalClinica,
} = require("../controllers/personalClinica-controller");

router.use(checkAuth);

router.get("/", getPersonalClinica);
router.get("/personal-existente", getPersonalClinicaExistente);
router.patch("/mi-perfil", updateMiPerfil);
router.patch("/mi-perfil/fotoPerfil", fileUpload.single("fotoPerfilPersonal"), addS3Key, updateMiFotoPerfil);
router.get("/rol-id/:id", getPersonalClinicaByRolId);
router.get("/usuario/:id", getPersonalClinicaByUsuarioId);

router.patch("/usuario/:usuarioId/fotoPerfil", requireAdmin, fileUpload.single("fotoPerfilPersonal"), addS3Key, updateFotoPerfilPersonalClinica);
router.patch("/usuario/:usuarioId", requireAdmin, updatePerfilByUsuarioId);
router.delete("/usuario/:usuarioId", requireAdmin, deletePersonalClinica);

router.get("/:id", getPersonalClinicaById);
router.post("/", createPersonalClinica);

module.exports = router;
