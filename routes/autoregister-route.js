const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");
const { createAutoRegister } = require("../controllers/autoRegister-controller");

const router = express.Router();

router.use(checkAuth);

router.post("/", [
  check("registration_link").not().isEmpty().withMessage("Registration link es requerido"),  
], createAutoRegister);

module.exports = router;