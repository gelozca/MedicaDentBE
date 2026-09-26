const express = require("express");
const { whatsappWebhook } = require("../controllers/whatsapp-controller");

const router = express.Router();

router.post("/twilio/whatsapp", express.urlencoded({ extended: false }), whatsappWebhook);

module.exports = router;
