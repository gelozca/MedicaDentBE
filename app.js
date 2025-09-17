const express = require("express");
const bodyParser = require("body-parser");
const dashboardPacientesRoutes = require("./routes/dashboardPacientes-routes");
const usuariosLoginRoutes = require("./routes/usuariosLogin-routes");
const historialMedicoRoutes = require("./routes/historialMedico-routes");
const personalClinicaRoutes = require("./routes/personalClinica-routes");
const HttpError = require("./models/http-error");
const autoRegisterRoutes = require("./routes/autoregister-route");
const odontogramaRoutes = require("./routes/odontograma-route");

const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 5001;

// CORS middleware should come before body parser
app.use("/", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use((req, res, next) => {
  if (
    req.headers["content-type"] &&
    req.headers["content-type"].includes("multipart/form-data")
  ) {
    next();
  } else {
    bodyParser.json()(req, res, next);
  }
});

app.use((req, res, next) => {
  if (req.method === "PATCH" && req.path.includes("/pacientes/")) {
    console.log("Request body in middleware:", req.body);
    console.log("Content-Type:", req.headers["content-type"]);
  }
  next();
});

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use("/pacientes", dashboardPacientesRoutes);

app.use("/usuarios", usuariosLoginRoutes);

app.use("/historial-medico", historialMedicoRoutes);

app.use("/personal-clinica", personalClinicaRoutes);

app.use("/registro-paciente", autoRegisterRoutes);

app.use("/odontograma", odontogramaRoutes);

app.use((req, res, next) => {
  const error = new HttpError("No se encontro la ruta", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);

  if (error.validationErrors && error.validationErrors.length > 0) {
    res.json({
      message: error.validationErrors[0],
    });
  } else {
    res.json({ message: error.message || "Un error desconocido ocurrio!" });
  }
});

app.listen(PORT);
