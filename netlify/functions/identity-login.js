// Evento Identity: ingreso al sistema (login).
// Convención legacy por nombre de archivo (sigue soportada por Netlify).
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  try {
    const store = getStore({ name: "movimientos" });
    const user = event.user || {};
    const key = `login:${Date.now()}:${(user.id || "anon") + Math.random().toString(36).slice(2, 6)}`;
    const am = user.app_metadata || {};
    const roles = (Array.isArray(am.roles) && am.roles)
      || (am.authorization && Array.isArray(am.authorization.roles) && am.authorization.roles)
      || [];
    await store.setJSON(key, {
      type: "login",
      email: user.email || "",
      userId: user.id || "",
      at: new Date().toISOString(),
      roles,
    });
  } catch (err) {
    console.error("identity-login error", err);
  }
  return { statusCode: 200, body: "{}" };
};