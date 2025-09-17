const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const {
  createOdontogramaDao,
  getOdontogramaByPacienteIdDao,
  createOdontogramaDienteDao,
  getOdontogramaDienteByOdontogramaIdDao,
  updateOdontogramaDienteByIdDao,
  deleteOdontogramaDienteByIdDao,
  deleteOdontogramaByPacienteIdDao,
  getDienteByIdDao,
} = require("../dao/odontogramaDao");

const createOdontograma = async (req, res, next) => {
  try {
    const { paciente_id, fecha_odontograma, tipo } = req.body;
    const odontograma = await createOdontogramaDao(
      paciente_id,
      fecha_odontograma,
      tipo
    );
    res.status(201).json(odontograma);
  } catch (error) {
    return next(new HttpError("Error al crear el odontograma", 500));
  }
};

const getOdontogramaByPacienteId = async (req, res, next) => {
  try {
    const odontogramas = await getOdontogramaByPacienteIdDao(req.params.id);

    if (!odontogramas || odontogramas.length === 0) {
      return res.status(404).json({
        message: "No se encontraron odontogramas para este paciente",
        odontogramas: [],
      });
    }

    res.json({ odontogramas: odontogramas });
  } catch (error) {
    return next(new HttpError("Error al obtener los odontogramas", 500));
  }
};

const createOdontogramaDiente = async (req, res, next) => {
  try {
    const diente = await createOdontogramaDienteDao(req.body);
    res.status(201).json(diente);
  } catch (error) {
    return next(new HttpError("Error al crear el diente del odontograma", 500));
  }
};

const getOdontogramaDienteByOdontogramaId = async (req, res, next) => {
  try {
    const dientes = await getOdontogramaDienteByOdontogramaIdDao(req.params.id);
    if (!dientes || dientes.length === 0) {
      return res.status(404).json({
        message: "No se encontraron dientes para este odontograma",
        dientes: [],
      });
    }
    res.json(dientes);
  } catch (error) {
    return next(
      new HttpError("Error al obtener los dientes del odontograma", 500)
    );
  }
};

const updateOdontogramaDienteById = async (req, res, next) => {
  try {
    const diente = await updateOdontogramaDienteByIdDao(
      req.params.id,
      req.body
    );
    if (!diente) {
      return res.status(404).json({
        message: "No se encontró el diente del odontograma para actualizar",
        diente: null,
      });
    }
    res.json(diente);
  } catch (error) {
    return next(
      new HttpError("Error al actualizar el diente del odontograma", 500)
    );
  }
};

const deleteOdontogramaDienteById = async (req, res, next) => {
  try {
    const diente = await deleteOdontogramaDienteByIdDao(req.params.id);

    if (!diente) {
      return res.status(404).json({
        message: "No se encontró el diente del odontograma para eliminar",
      });
    }

    res.json({
      message: "Diente del odontograma eliminado exitosamente",
      deletedDiente: diente,
    });
  } catch (error) {
    return next(
      new HttpError("Error al eliminar el diente del odontograma", 500)
    );
  }
};

const deleteOdontogramaByPacienteId = async (req, res, next) => {
  try {
    const odontogramas = await deleteOdontogramaByPacienteIdDao(req.params.id);

    if (!odontogramas || odontogramas.length === 0) {
      return res.status(404).json({
        message:
          "No se encontraron odontogramas para eliminar para este paciente",
        deletedCount: 0,
      });
    }

    res.json({
      message: "Odontogramas eliminados exitosamente",
      deletedCount: odontogramas.length,
      deletedOdontogramas: odontogramas,
    });
  } catch (error) {
    return next(new HttpError("Error al eliminar el odontograma", 500));
  }
};

const getDienteById = async (req, res, next) => {
  try {
    const diente = await getDienteByIdDao(req.params.id);
    if (!diente) {
      return res.status(404).json({
        message: "No se encontró el diente",
        diente: null,
      });
    }
    res.json(diente);
  } catch (error) {
    return next(new HttpError("Error al obtener el diente", 500));
  }
};

module.exports = {
  createOdontograma,
  getOdontogramaByPacienteId,
  updateOdontogramaDienteById,
  deleteOdontogramaDienteById,
  createOdontogramaDiente,
  getOdontogramaDienteByOdontogramaId,
  deleteOdontogramaByPacienteId,
  getDienteById,
};
