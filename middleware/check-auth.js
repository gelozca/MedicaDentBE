const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      const error = new HttpError("No token provided", 401);
      return next(error);
    }
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userData = {
      id: decodedToken.id,
      email: decodedToken.email,
      rol: decodedToken.rol,
      activo: decodedToken.activo,
    };
    next();
  } catch (error) {
    return next(new HttpError("Token invalido", 401));
  }
};
