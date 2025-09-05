const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createAutoRegisterDao, getAutoRegisterDao, updateAutoRegisterByIdDao } = require("../dao/autoRegisterDao");

const createAutoRegister = async (req, res, next) => {
  try {
    const autoRegister = await createAutoRegisterDao();
    res.status(201).json(autoRegister);
  } catch (error) {
    return next(new HttpError("Error al crear el auto register", 500));
  }
};

const getAutoRegister = async (req, res, next) => {
  try {
    const autoRegister = await getAutoRegisterDao();
    res.json(autoRegister);
  } catch (error) {
    return next(new HttpError("Error al obtener el auto register", 500));
  }
};

const updateAutoRegisterById = async (req, res, next) => {
  try {
    const autoRegister = await updateAutoRegisterByIdDao(req.params.id, req.body);    
    if (!autoRegister) {
      return next(new HttpError("Link de registro no encontrado", 404));
    }
    res.json(autoRegister);
  } catch (error) {
    return next(new HttpError("Error al actualizar el link de registro", 500));
  }
};

module.exports = { createAutoRegister, getAutoRegister, updateAutoRegisterById };