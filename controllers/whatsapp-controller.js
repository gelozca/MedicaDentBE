const { normalizePhone } = require("../services/whatsapp/diagnostico");
const { findDoctorByPhone } = require("../services/whatsapp/conversacion");
const { firmaValida, twiml, sendWhatsapp } = require("../services/whatsapp/twilioClient");
const { handleWhatsapp, mensajeError } = require("../services/whatsapp/flujo");

const MENSAJES = {
  no_autorizado: "Este número no está autorizado para registrar diagnósticos en MedicaDent.",
  sin_perfil_doctor:
    "Tu número está en el personal de la clínica, pero no hay un perfil de doctor ligado. No puedo guardar el diagnóstico.",
};

const whatsappWebhook = async (req, res) => {
  if (!firmaValida(req)) {
    return res.status(403).type("text/plain").send("Firma invalida");
  }

  const from = req.body.From || "";
  const telefono = normalizePhone(from);

  try {
    const { doctor, motivo } = await findDoctorByPhone(from);
    if (!doctor) {
      return twiml(res, MENSAJES[motivo] || MENSAJES.no_autorizado);
    }

    twiml(res);
    const respuesta = await handleWhatsapp({
      telefono,
      doctor,
      body: req.body.Body,
      mediaUrl: Number(req.body.NumMedia) > 0 ? req.body.MediaUrl0 : null,
      mediaType: req.body.MediaContentType0,
    });
    await sendWhatsapp(from, respuesta);
  } catch (error) {
    console.error("Error en webhook de WhatsApp");
    if (!res.headersSent) {
      return twiml(res, mensajeError(error));
    }
    try {
      await sendWhatsapp(from, mensajeError(error));
    } catch (sendError) {
      console.error("No se pudo enviar la respuesta de WhatsApp");
    }
  }
};

module.exports = { whatsappWebhook };
