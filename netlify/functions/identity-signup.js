// Evento Identity: registro completado.
// Convención legacy por nombre de archivo (sigue soportada por Netlify).
const { getStore } = require("@netlify/blobs");

// Notifica por correo a la dueña usando un Form de Netlify (normalmente
// el correo de la cuenta de Netlify). Sin servicios externos.
async function notifyNewUser(user) {
  try {
    const siteUrl = (process.env.URL || "https://de-todo-catalogo.netlify.app").replace(/\/+$/, "");
    const meta = user.user_metadata || {};
    const body = new URLSearchParams({
      "form-name": "nueva-cuenta",
      nombre: meta.full_name || meta.name || "",
      email: user.email || "",
      hora: new Date().toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }),
    }).toString();
    await fetch(siteUrl + "/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (err) {
    console.error("notifyNewUser error", err);
  }
}

exports.handler = async (event) => {
  try {
    const store = getStore({ name: "movimientos" });
    const user = event.user || {};
    const key = `signup:${Date.now()}:${(user.id || "anon") + Math.random().toString(36).slice(2, 6)}`;
    const am = user.app_metadata || {};
    const roles = (Array.isArray(am.roles) && am.roles)
      || (am.authorization && Array.isArray(am.authorization.roles) && am.authorization.roles)
      || [];
    await store.setJSON(key, {
      type: "signup",
      email: user.email || "",
      userId: user.id || "",
      at: new Date().toISOString(),
      roles,
    });
    await notifyNewUser(user);
  } catch (err) {
    console.error("identity-signup error", err);
  }
  return { statusCode: 200, body: "{}" };
};