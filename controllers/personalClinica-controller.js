const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3, generateProfilePictureUrl } = require("../config/s3");
const bucketName = process.env.AWS_S3_BUCKET;

const ADMIN_ROL_ID = "43925481-7cbe-4c2b-b95e-e57d889d3998";

const {
  getPersonalClinicaDao,
  getPersonalClinicaByIdDao,
  createPersonalClinicaDao,
  getPersonalClinicaByEmailDao,
  getPersonalClinicaByTelefonoDao,
  getPersonalClinicaByRolIdDao,
  getPersonalClinicaByUsuarioIdDao,
  updatePersonalClinicaByUsuarioIdDao,
  updateFotoPerfilPersonalClinicaByUsuarioIdDao,
  deleteUsuarioByIdDao,
} = require("../dao/personalClinicaDao");

const requireAdmin = (req, res, next) => {
  if (req.userData.rol !== ADMIN_ROL_ID) {
    return next(new HttpError("Solo el administrador puede realizar esta acción", 403));
  }
  next();
};

const getPersonalClinica = async (req, res, next) => {
  try {
    const personalClinica = await getPersonalClinicaDao();

    res.json(personalClinica);
  } catch (error) {
    return next(
      new HttpError("Error al obtener el personal de la clínica", 500)
    );
  }
};

const getPersonalClinicaById = async (req, res, next) => {
  try {
    const personalClinica = await getPersonalClinicaByIdDao(req.params.id);
    res.json(personalClinica);
  } catch (error) {
    return next(
      new HttpError("Error al obtener el personal de la clínica", 500)
    );
  }
};

const getPersonalClinicaByUsuarioId = async (req, res, next) => {
  try {
    const personalClinica = await getPersonalClinicaByUsuarioIdDao(req.params.id);
    if (!personalClinica) {
      return next(
        new HttpError("No se encontro el personal de la clínica", 404)
      );
    }
    if (personalClinica.foto_perfil_url) {
      personalClinica.foto_perfil_url = generateProfilePictureUrl(personalClinica.foto_perfil_url);
    }
    res.json(personalClinica);
  } catch (error) {
    return next(
      new HttpError("Error al obtener el personal de la clínica", 500)
    );
  }
};
const createPersonalClinica = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new HttpError("Datos invalidos", 422, errors.array()));
    }

    const { correo, num_telefono } = req.body;
    const personalClinicaExistenteCorreo = await getPersonalClinicaByEmailDao(
      correo
    );
    if (personalClinicaExistenteCorreo) {
      return next(
        new HttpError("Personal de la clínica con este correo ya existe", 422)
      );
    }
    const personalClinicaExistenteTelefono =
      await getPersonalClinicaByTelefonoDao(num_telefono);
    if (personalClinicaExistenteTelefono) {
      return next(
        new HttpError("Personal de la clínica con este telefono ya existe", 422)
      );
    }

    const personalClinica = await createPersonalClinicaDao(req.body);
    res.json(personalClinica);
  } catch (error) {
    return next(new HttpError("Error al crear el personal de la clínica", 500));
  }
};

const getPersonalClinicaByRolId = async (req, res, next) => {
  try {
    const personalClinica = await getPersonalClinicaByRolIdDao(req.params.id);
    res.json(personalClinica);
  } catch (error) {
    return next(
      new HttpError("Error al obtener el personal de la clínica", 500)
    );
  }
};

const getPersonalClinicaExistente = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Datos invalidos", 422, errors.array()));
  }

  const { correo, num_telefono } = req.query;

  const result = { datos: null };

  const personalClinicaByEmail = await getPersonalClinicaByEmailDao(correo);
  if (personalClinicaByEmail) {
    result.datos = personalClinicaByEmail;
  } else {
    const personalClinicaByTelefono = await getPersonalClinicaByTelefonoDao(num_telefono);
    if (personalClinicaByTelefono) {
      result.datos = personalClinicaByTelefono;
    }
  }
  return res.status(200).json(result);
};

const updateMiPerfil = async (req, res, next) => {
  try {
    const usuarioId = req.userData.id;
    const perfilActual = await getPersonalClinicaByUsuarioIdDao(usuarioId);
    if (!perfilActual) {
      return next(new HttpError("No tiene datos de perfil para actualizar", 404));
    }

    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      num_telefono,
      fecha_nacimiento,
      direccion,
      puesto,
      especialidad,
      numero_licencia,
      numero_cuenta,
      banco,
    } = req.body;

    if (correo) {
      const existente = await getPersonalClinicaByEmailDao(correo.trim().toLowerCase());
      if (existente && existente.usuario_id !== usuarioId) {
        return next(new HttpError("Ese correo ya está en uso por otro usuario", 422));
      }
    }

    const actualizado = await updatePersonalClinicaByUsuarioIdDao(usuarioId, {
      nombre: nombre?.trim(),
      apellido_paterno: apellido_paterno != null ? apellido_paterno : "",
      apellido_materno: apellido_materno?.trim(),
      correo: correo?.trim().toLowerCase(),
      num_telefono: num_telefono?.replace(/\D/g, ""),
      fecha_nacimiento: fecha_nacimiento || null,
      direccion: direccion?.trim() || null,
      puesto: puesto?.trim() || null,
      especialidad: especialidad?.trim() || null,
      numero_licencia: numero_licencia?.trim() || null,
      numero_cuenta: numero_cuenta?.trim() || null,
      banco: banco?.trim() || null,
    });
    res.json(actualizado);
  } catch (error) {
    return next(new HttpError("Error al actualizar el perfil", 500));
  }
};

const updatePerfilByUsuarioId = async (req, res, next) => {
  try {
    const usuarioId = req.params.usuarioId;
    const perfilActual = await getPersonalClinicaByUsuarioIdDao(usuarioId);
    if (!perfilActual) {
      return next(new HttpError("No se encontró el personal para actualizar", 404));
    }
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      num_telefono,
      fecha_nacimiento,
      direccion,
      puesto,
      especialidad,
      numero_licencia,
      numero_cuenta,
      banco,
    } = req.body;
    if (correo) {
      const existente = await getPersonalClinicaByEmailDao(correo.trim().toLowerCase());
      if (existente && existente.usuario_id !== usuarioId) {
        return next(new HttpError("Ese correo ya está en uso por otro usuario", 422));
      }
    }
    const actualizado = await updatePersonalClinicaByUsuarioIdDao(usuarioId, {
      nombre: nombre?.trim(),
      apellido_paterno: apellido_paterno != null ? apellido_paterno : "",
      apellido_materno: apellido_materno?.trim(),
      correo: correo?.trim().toLowerCase(),
      num_telefono: num_telefono?.replace(/\D/g, ""),
      fecha_nacimiento: fecha_nacimiento || null,
      direccion: direccion?.trim() || null,
      puesto: puesto?.trim() || null,
      especialidad: especialidad?.trim() || null,
      numero_licencia: numero_licencia?.trim() || null,
      numero_cuenta: numero_cuenta?.trim() || null,
      banco: banco?.trim() || null,
    });
    if (actualizado.foto_perfil_url) {
      actualizado.foto_perfil_url = generateProfilePictureUrl(actualizado.foto_perfil_url);
    }
    res.json(actualizado);
  } catch (error) {
    return next(new HttpError("Error al actualizar el perfil del personal", 500));
  }
};

const updateMiFotoPerfil = async (req, res, next) => {
  if (!req.file) {
    return next(new HttpError("No se proporcionó archivo de imagen", 400));
  }
  try {
    const usuarioId = req.userData.id;
    const perfilActual = await getPersonalClinicaByUsuarioIdDao(usuarioId);
    if (!perfilActual) {
      return next(new HttpError("No se encontró su perfil", 404));
    }
    if (perfilActual.foto_perfil_url) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: perfilActual.foto_perfil_url,
          })
        );
      } catch (deleteError) {
        console.error("Error deleting old profile photo from S3:", deleteError);
      }
    }
    const fotoPerfilKey = req.file.s3Key;
    const actualizado = await updateFotoPerfilPersonalClinicaByUsuarioIdDao(usuarioId, fotoPerfilKey);
    if (actualizado.foto_perfil_url) {
      actualizado.foto_perfil_url = generateProfilePictureUrl(actualizado.foto_perfil_url);
    }
    res.status(200).json(actualizado);
  } catch (error) {
    return next(new HttpError("Error al actualizar su foto de perfil", 500));
  }
};

const updateFotoPerfilPersonalClinica = async (req, res, next) => {
  if (!req.file) {
    return next(new HttpError("No se proporcionó archivo de imagen", 400));
  }
  try {
    const { usuarioId } = req.params;
    const perfilActual = await getPersonalClinicaByUsuarioIdDao(usuarioId);
    if (!perfilActual) {
      return next(new HttpError("No se encontró el personal", 404));
    }
    if (perfilActual.foto_perfil_url) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: perfilActual.foto_perfil_url,
          })
        );
      } catch (deleteError) {
        console.error("Error deleting old profile photo from S3:", deleteError);
      }
    }
    const fotoPerfilKey = req.file.s3Key;
    const actualizado = await updateFotoPerfilPersonalClinicaByUsuarioIdDao(usuarioId, fotoPerfilKey);
    if (actualizado.foto_perfil_url) {
      actualizado.foto_perfil_url = generateProfilePictureUrl(actualizado.foto_perfil_url);
    }
    res.status(200).json(actualizado);
  } catch (error) {
    return next(new HttpError("Error al actualizar la foto de perfil del personal", 500));
  }
};

const deletePersonalClinica = async (req, res, next) => {
  try {
    const { usuarioId } = req.params;
    if (req.userData.id === usuarioId) {
      return next(new HttpError("No puede eliminarse a sí mismo", 400));
    }
    const perfilActual = await getPersonalClinicaByUsuarioIdDao(usuarioId);
    if (!perfilActual) {
      return next(new HttpError("No se encontró el personal", 404));
    }
    const deleted = await deleteUsuarioByIdDao(usuarioId);
    if (!deleted) {
      return next(new HttpError("Error al eliminar el personal", 500));
    }
    res.status(200).json({ message: "Personal eliminado correctamente" });
  } catch (error) {
    return next(new HttpError("Error al eliminar el personal", 500));
  }
};

module.exports = {
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
};
