// Bootstrap temporal: asigna rol admin al correo del dueño.
// Usa el operator token de Netlify (context.clientContext.identity) para
// llamar al endpoint admin de Identity. Protegido por BOOTSTRAP_ADMIN_KEY.
exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const expected = process.env.BOOTSTRAP_ADMIN_KEY || "";
    const provided = (event.headers["x-bootstrap-key"] || "").trim();
    if (!expected || provided !== expected) {
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
    }

    const ident = (context && context.clientContext && context.clientContext.identity) || {};
    const baseUrl = ident.url || process.env.URL || "";
    const token = ident.token || "";

    if (!baseUrl || !token) {
      return { statusCode: 500, body: JSON.stringify({ error: "Identity operator token not available" }) };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const email = (body.email || "").trim().toLowerCase();
    const role = (body.role || "admin").trim();

    const listRes = await fetch(`${baseUrl}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listRes.ok) {
      const txt = await listRes.text();
      return { statusCode: listRes.status, body: JSON.stringify({ error: `list users failed: ${txt}` }) };
    }
    const users = (await listRes.json()).users || [];

    const user = users.find((u) => (u.email || "").toLowerCase() === email);

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found", emails: users.map((u) => u.email) }),
      };
    }

    const appMetadata = { ...(user.app_metadata || {}), roles: [role] };
    const updRes = await fetch(`${baseUrl}/admin/users/${encodeURIComponent(user.id)}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ app_metadata: appMetadata }),
    });

    if (!updRes.ok) {
      const txt = await updRes.text();
      return { statusCode: updRes.status, body: JSON.stringify({ error: `update user failed: ${txt}` }) };
    }

    const updated = await updRes.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        id: updated.id,
        email: updated.email,
        app_metadata: updated.app_metadata || {},
      }),
    };
  } catch (err) {
    console.error("bootstrap-admin error", err);
    return { statusCode: 500, body: JSON.stringify({ error: String((err && err.message) || err) }) };
  }
};