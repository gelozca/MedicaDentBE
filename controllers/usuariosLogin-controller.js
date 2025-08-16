const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const {
  getUsuarios,
  createUsuarioDao,
  getUsuarioByEmail,
  getUsuarioByUsername,
  getRoleById,
  updatePasswordDao,
} = require("../dao/usuariosDao");

const createUsuario = async (req, res, next) => {
  const { username, email, password, rol_id } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return next(new HttpError("Datos invalidos", 422, errorMessages));
  }

  try {
    const usuarioExistente = await getUsuarioByEmail(email);
    const usuarioExistenteUsername = await getUsuarioByUsername(username);
    const rol = await getRoleById(rol_id);

    if (usuarioExistente) {
      return next(new HttpError("Usuario con este email ya existe", 422));
    }
    if (usuarioExistenteUsername) {
      return next(new HttpError("Usuario con este username ya existe", 422));
    }
    if (!rol) {
      return next(new HttpError("Rol invalido", 422));
    }

    const nuevoUsuario = { id: uuidv4(), username, email, password, rol_id };
    const result = await createUsuarioDao(nuevoUsuario);

    const token = jwt.sign(
      {
        id: result.id,
        email: result.email,
        rol: result.rol_id,
        activo: result.activo,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      id: result.id,
      token: token,
    });
  } catch (error) {
    return next(new HttpError("Error al crear el usuario", 500));
  }
};

const getAllUsuarios = async (req, res, next) => {
  try {
    const usuarios = await getUsuarios();
    res.json(usuarios);
  } catch (error) {
    return next(new HttpError("Error al obtener los usuarios", 500));
  }
};

const loginUsuario = async (req, res, next) => {
  const { email, password } = req.body;

  let usuario = await getUsuarioByEmail(email);
  if (!usuario) {
    const usuarioUsername = await getUsuarioByUsername(email.replace("@", ""));
    if (!usuarioUsername) {
      return next(new HttpError("Usuario o contraseña incorrectos", 401));
    }
    usuario = usuarioUsername;
  }

  if (usuario.activo === false) {
    return next(new HttpError("Usuario inactivo", 401));
  }
  const passwordMatch = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordMatch) {
    return next(new HttpError("Usuario o contraseña incorrectos", 401));
  }

  const token = jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol_id,
      activo: usuario.activo,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    id: usuario.id,
    token: token,
  });
};

const cambiarPassword = async (req, res, next) => {
  const { username, password } = req.body;

  let usuario = null;

  const usuarioUsername = await getUsuarioByUsername(username.replace("@", ""));
  if (!usuarioUsername) {
    const usuarioEmail = await getUsuarioByEmail(username);    
    if (!usuarioEmail) {
      return next(new HttpError("Usuario no encontrado", 404));
    }
    usuario = usuarioEmail;
  } else {
    usuario = usuarioUsername;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await updatePasswordDao(usuario.id, passwordHash);

  res.json({
    message: "Password actualizado correctamente",
  });
};

module.exports = {
  createUsuario,
  getAllUsuarios,
  loginUsuario,
  cambiarPassword,
};
