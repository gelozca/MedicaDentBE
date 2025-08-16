const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const {
  getHistorialMedicoByIdDao,
  updateHistorialMedicoDaoByIdDao,
} = require("../dao/historialMedicoDao");

const getHistorialMedicoById = async (req, res, next) => {
  try {
    const historialMedico = await getHistorialMedicoByIdDao(req.params.id);
    res.json(historialMedico);
  } catch (error) {
    return next(new HttpError("Error al obtener el historial medico", 500));
  }
};

const updateHistorialMedicoById = async (req, res, next) => {
  const { id } = req.params;
  const { ...rest } = req.body;

  try {
    if (!id) {
      return next(new HttpError("El ID del paciente es requerido", 400));
    }

    const historialMedico = await getHistorialMedicoByIdDao(id);
    if (!historialMedico) {
      return next(new HttpError("Historial médico no encontrado", 404));
    }

    const updatedHistorialMedico = await updateHistorialMedicoDaoByIdDao(
      id,
      rest
    );

    res.status(200).json(updatedHistorialMedico);
  } catch (error) {
    return next(new HttpError("Error al actualizar el historial médico", 500));
  }
};

module.exports = { getHistorialMedicoById, updateHistorialMedicoById };
