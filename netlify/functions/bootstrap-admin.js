// Bootstrap temporal: asigna rol admin al correo del dueño.
// Protegido por BOOTSTRAP_ADMIN_KEY (env var). Se retira tras el uso.
const { admin } = require("@netlify/identity");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const expected = process.env.BOOTSTRAP_ADMIN_KEY || "";
    const provided = (event.headers["x-bootstrap-key"] || "").trim();
    if (!expected || provided !== expected) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const email = (body.email || "").trim().toLowerCase();
    const role = (body.role || "admin").trim();

    const users = await admin.listUsers();
    const user = users.find((u) => (u.email || "").toLowerCase() === email);

    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found", users: users.map((u) => u.email) }) };
    }

    const updated = await admin.updateUser(user.id, {
      role: role,
      app_metadata: { ...(user.appMetadata || {}), roles: [role].filter(Boolean) },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id: updated.id, email: updated.email, roles: updated.roles || (updated.appMetadata && updated.appMetadata.roles) || [] }),
    };
  } catch (err) {
    console.error("bootstrap-admin error", err);
    return { statusCode: 500, body: JSON.stringify({ error: String((err && err.message) || err) }) };
  }
};