const speechToText = async (audioBuffer, contentType) => {
  const apiKey = process.env.SPEECH_TO_TEXT_API_KEY;
  if (!apiKey) {
    const error = new Error("Speech-to-Text no configurado");
    error.code = "config";
    throw error;
  }

  const extension = contentType && contentType.includes("mpeg") ? "mp3" : "ogg";
  const form = new FormData();
  form.append("file", new Blob([audioBuffer], { type: contentType || "audio/ogg" }), `nota.${extension}`);
  form.append("model", "whisper-1");
  form.append("language", "es");
  form.append(
    "prompt",
    "Nota clínica odontológica en español de México. Piezas dentales en notación FDI, por ejemplo 46."
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const error = new Error("Error del proveedor de transcripción");
    error.code = "provider";
    throw error;
  }

  const data = await response.json();
  const text = String(data.text || "").trim();
  if (!text) {
    const error = new Error("Transcripción vacía");
    error.code = "empty";
    throw error;
  }
  return text;
};

module.exports = { speechToText };
