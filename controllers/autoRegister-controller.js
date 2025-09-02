const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createAutoRegisterDao } = require("../dao/autoRegisterDao");

const createAutoRegister = async (req, res, next) => {
  const { registration_link } = req.body;
  const autoRegister = await createAutoRegisterDao(registration_link);
  res.json(autoRegister);
};

module.exports = { createAutoRegister };