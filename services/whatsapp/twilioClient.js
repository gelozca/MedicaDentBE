const twilio = require("twilio");

const client = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const webhookUrl = (req) => {
  if (process.env.TWILIO_WEBHOOK_URL) {
    return process.env.TWILIO_WEBHOOK_URL;
  }
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}${req.originalUrl}`;
};

const firmaValida = (req) => {
  const signature = req.get("x-twilio-signature");
  if (!signature || !process.env.TWILIO_AUTH_TOKEN) {
    return false;
  }
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    webhookUrl(req),
    req.body || {}
  );
};

const twiml = (res, message) => {
  const response = new twilio.twiml.MessagingResponse();
  if (message) {
    response.message(message);
  }
  res.status(200).type("text/xml").send(response.toString());
};

const sendWhatsapp = async (to, body) => {
  await client().messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to,
    body,
  });
};

const downloadMedia = async (mediaUrl) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
    },
  });
  if (!response.ok) {
    const error = new Error("No se pudo descargar el audio");
    error.code = "upload";
    throw error;
  }
  const contentType = response.headers.get("content-type") || "audio/ogg";
  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return { audioBuffer, contentType };
};

module.exports = {
  firmaValida,
  twiml,
  sendWhatsapp,
  downloadMedia,
};
