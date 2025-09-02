const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const {
  getPersonalClinicaDao,
  getPersonalClinicaByIdDao,
  createPersonalClinicaDao,
  getPersonalClinicaByEmailDao,
  getPersonalClinicaByTelefonoDao,
  getPersonalClinicaByRolIdDao,
  getPersonalClinicaByUsuarioIdDao,
} = require("../dao/personalClinicaDao");
const { getUsuarioByUsername } = require("../dao/usuariosDao");

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

  const { correo, num_telefono, username } = req.query;

  const result = {
    datos: null,
  };

  const personalClinicaByUsername = await getUsuarioByUsername(username);
  if (personalClinicaByUsername) {
    result.datos = personalClinicaByUsername;
  }

  const personalClinicaByEmail = await getPersonalClinicaByEmailDao(correo);
  if (personalClinicaByEmail) {
    result.datos = personalClinicaByEmail;
  }
  const personalClinicaByTelefono = await getPersonalClinicaByTelefonoDao(
    num_telefono
  );
  if (personalClinicaByTelefono) {
    result.datos = personalClinicaByTelefono;
  }
  return res.status(200).json(result);
};

module.exports = {
  getPersonalClinica,
  getPersonalClinicaById,
  createPersonalClinica,
  getPersonalClinicaByRolId,
  getPersonalClinicaExistente,
  getPersonalClinicaByUsuarioId,
};
