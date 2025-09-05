const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");
const { createAutoRegister, getAutoRegister, updateAutoRegisterById } = require("../controllers/autoRegister-controller");

const router = express.Router();

router.get("/",getAutoRegister);

router.patch("/:id", updateAutoRegisterById);

router.use(checkAuth);

router.post("/",createAutoRegister);

module.exports = router;