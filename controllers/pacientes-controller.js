const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const {
  getAllPacientesDao,
  getPacienteByIdDao,
  createPacienteDao,
  updatePacienteByIdDao,
  deletePacienteByIdDao,
  updateFotoPerfilPacienteByIdDao,
  getPacienteByEmailDao,
  getPacienteByTelefonoDao,
} = require("../dao/pacientesDao");

const getAllPacientes = async (req, res, next) => {
  try {
    const pacientes = await getAllPacientesDao();
    res.json(pacientes);
  } catch (error) {
    return next(new HttpError("Error al obtener los pacientes", 500));
  }
};

const getPacienteById = async (req, res, next) => {
  try {
    const paciente = await getPacienteByIdDao(req.params.id);
    if (!paciente) {
      return next(new HttpError("Paciente no encontrado", 404));
    }
    res.json(paciente);
  } catch (error) {
    return next(new HttpError("Error al obtener el paciente", 500));
  }
};

const createPaciente = async (req, res, next) => {
  const { nombre, apellido_paterno, apellido_materno, sexo, fecha_nacimiento, correo, num_telefono, direccion, ocupacion} =
    req.body;
  try {    
    const paciente = await createPacienteDao(req.body);
    const response = {
      id: paciente.id,
      nombre: paciente.nombre,
      apellido_paterno: paciente.apellido_paterno,
      apellido_materno: paciente.apellido_materno,
      correo: paciente.correo,
      num_telefono: paciente.num_telefono      
    };
    res.status(201).json(response);
  } catch (error) {
    return next(new HttpError("Error al crear el paciente", 500));
  }
};

const updatePacienteById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(new HttpError("Datos invalidos", 422, errorMessages));
  }

  const { id } = req.params;
  
  
  const {
    nombre,
    apellido_paterno,
    apellido_materno,
    num_telefono,
    correo,
    direccion,
    color,
    clasificacion,
    foto_perfil_url,
    sexo,
    fecha_nacimiento,
    ocupacion,
  } = req.body;

  

  try {
    const pacienteExistente = await getPacienteByIdDao(id);
    if (!pacienteExistente) {
      return next(new HttpError("Paciente no encontrado", 404));
    }

    if(pacienteExistente.correo !== correo) {
      const pacienteExistenteCorreo = await getPacienteByEmailDao(correo);
      if (pacienteExistenteCorreo) {
        return next(new HttpError("Paciente con este correo ya existe", 422));
      }
    }

    if(pacienteExistente.num_telefono !== num_telefono) {
      const pacienteExistenteTelefono = await getPacienteByTelefonoDao(num_telefono);
      if (pacienteExistenteTelefono) {
        return next(new HttpError("Paciente con este telefono ya existe", 422));
      }
    }

    const paciente = await updatePacienteByIdDao(id, req.body);
    res.status(200).json(paciente);
  } catch (error) {
    return next(new HttpError("Error al actualizar el paciente", 500));
  }
};

const deletePacienteById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const pacienteExistente = await getPacienteByIdDao(id);
    if (!pacienteExistente) {
      return next(new HttpError("Paciente no encontrado", 404));
    }

    if (pacienteExistente.foto_perfil_url) {
      try {
        const existingPhotoPath = path.join(
          __dirname,
          "..",
          pacienteExistente.foto_perfil_url
        );
        if (fs.existsSync(existingPhotoPath)) {
          fs.unlinkSync(existingPhotoPath);
        }
      } catch (deleteError) {
        console.error("Error deleting existing profile photo:", deleteError);
      }
    }

    await deletePacienteByIdDao(id);
    res.status(200).json({ message: "Paciente eliminado correctamente" });
  } catch (error) {
    return next(new HttpError("Error al eliminar el paciente", 500));
  }
};

const updateFotoPerfilPacienteById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(new HttpError("Datos invalidos", 422, errorMessages));
  }

  const { id } = req.params;

  try {
    const pacienteExistente = await getPacienteByIdDao(id);
    if (!pacienteExistente) {
      return next(new HttpError("Paciente no encontrado", 404));
    }

    if (pacienteExistente.foto_perfil_url) {
      try {
        const existingPhotoPath = path.join(
          __dirname,
          "..",
          pacienteExistente.foto_perfil_url
        );
        if (fs.existsSync(existingPhotoPath)) {
          fs.unlinkSync(existingPhotoPath);
        }
      } catch (deleteError) {
        console.error("Error deleting existing profile photo:", deleteError);
      }
    }

    const fotoPerfilUrl = req.file.path;

    const paciente = await updateFotoPerfilPacienteByIdDao(id, fotoPerfilUrl);
    res.status(200).json(paciente);
  } catch (error) {
    return next(
      new HttpError("Error al actualizar la foto de perfil del paciente", 500)
    );
  }
};

const getDatosContacto = async (req, res, next) => {
  const { num_telefono, correo } = req.query;
  
  const result = {
    paciente: null,
  }

  const pacienteByEmail = await getPacienteByEmailDao(correo);
  if (pacienteByEmail) {
    result.paciente = pacienteByEmail;
  }
  const pacienteByTelefono = await getPacienteByTelefonoDao(num_telefono);
  if (pacienteByTelefono) {
    result.paciente = pacienteByTelefono;
  }
  return res.status(200).json(result);
};

module.exports = {
  getAllPacientes,
  getPacienteById,
  createPaciente,
  updatePacienteById,
  deletePacienteById,
  updateFotoPerfilPacienteById,
  getDatosContacto,
};
