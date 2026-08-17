// TEMPORAL — invocación SOLO desde CLI/terminal.
// Lee el registro REAL de usuarios en Netlify Identity (diagnóstico).
//
//   GET /.netlify/functions/identity-check
//   Header: x-bootstrap-key: <BOOTSTRAP_ADMIN_KEY env var>
//
// Devuelve los app_metadata (roles) almacenados en Identity para saber
// si el rol admin ya está en la ruta canónica app_metadata.roles.
// Se elimina tras confirmar la reparación.

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "{}" };
  }

  const secret = process.env.BOOTSTRAP_ADMIN_KEY || "";
  const provided = (event.headers["x-bootstrap-key"] || "").trim();
  if (!secret || provided !== secret) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }

  const ident = (context && context.clientContext && context.clientContext.identity) || {};
  if (!ident.url || !ident.token) {
    return { statusCode: 500, body: JSON.stringify({ error: "no operator token" }) };
  }

  try {
    const res = await fetch(`${ident.url}/admin/users?per_page=200`, {
      headers: { Authorization: `Bearer ${ident.token}` },
    });
    const data = await res.json();
    const users = (data.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      confirmed_at: u.confirmed_at || null,
      app_metadata: u.app_metadata || {},
      role: u.role || null,
      user_metadata: u.user_metadata || {},
    }));
    return { statusCode: 200, body: JSON.stringify({ users }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String((e && e.message) || e) }) };
  }
};