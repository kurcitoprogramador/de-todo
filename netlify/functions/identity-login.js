// Evento Identity: ingreso al sistema (login).
// Convención legacy por nombre de archivo (sigue soportada por Netlify).
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  try {
    const store = getStore({ name: "movimientos" });
    const user = event.user || {};
    const key = `login:${Date.now()}:${(user.id || "anon") + Math.random().toString(36).slice(2, 6)}`;
    await store.setJSON(key, {
      type: "login",
      email: user.email || "",
      userId: user.id || "",
      at: new Date().toISOString(),
      roles: (user.app_metadata && user.app_metadata.authorization && user.app_metadata.authorization.roles) || [],
    });
  } catch (err) {
    console.error("identity-login error", err);
  }
  return { statusCode: 200, body: "{}" };
};