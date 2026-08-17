// Diagnóstico: decodifica el JWT enviado como Bearer y devuelve payload crudo.
// No verifica firma. Solo para debug. Retirar cuando no se necesite.
// GET /.netlify/functions/decode-token  Authorization: Bearer <access_token>
exports.handler = async (event) => {
  const auth = event.headers["authorization"] || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { statusCode: 400, body: JSON.stringify({ error: "no token" }) };
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Not a JWT");
    const pad = (s) => s + "=".repeat((4 - (s.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(pad(parts[1]), "base64url").toString("utf8"));
    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ payload }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
