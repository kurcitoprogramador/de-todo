
// Fija el rol "admin" en app_metadata.authorization.roles para un usuario
// dado su email. Solo funciona cuando el operator token está disponible
// (contexto Netlify Function con Identity activo).
// Llamar con: POST /.netlify/functions/set-role
// Body JSON: { "email": "...", "role": "admin" }
// Header requerido: x-set-role-key: <SET_ROLE_KEY env var>

const ALLOWED_ROLES = ["admin", "editor"];

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "{}" };
  }

  // Autenticación por key de env
  const roleKey = process.env.SET_ROLE_KEY || "";
  const provided = (event.headers["x-set-role-key"] || "").trim();
  if (!roleKey || provided !== roleKey) {
    return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }
  const { email, role } = body;

  if (!email || !ALLOWED_ROLES.includes(role)) {
    return { statusCode: 400, body: JSON.stringify({ error: "email y role requeridos" }) };
  }

  const ident = (context && context.clientContext && context.clientContext.identity) || {};
  if (!ident.url || !ident.token) {
    return { statusCode: 500, body: JSON.stringify({ error: "no operator token" }) };
  }

  // 1. Buscar usuario por email
  const listRes = await fetch(`${ident.url}/admin/users?per_page=200`, {
    headers: { Authorization: `Bearer ${ident.token}` },
  });
  const listData = await listRes.json();
  const users = listData.users || [];
  const target = users.find((u) => u.email === email);

  if (!target) {
    return { statusCode: 404, body: JSON.stringify({ error: "Usuario no encontrado", email }) };
  }

  // 2. Leer roles actuales (ambas rutas posibles)
  const am = target.app_metadata || {};
  const existingAuth = (am.authorization && am.authorization.roles) || am.roles || [];
  const newRoles = existingAuth.includes(role) ? existingAuth : [...existingAuth, role];

  // 3. Escribir en la ruta correcta: app_metadata.authorization.roles
  const patchRes = await fetch(`${ident.url}/admin/users/${target.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ident.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_metadata: {
        ...am,
        // Siempre usar authorization.roles (es la ruta que Netlify lee para el JWT)
        authorization: { roles: newRoles },
        // Mantener compatibilidad con la ruta plana también
        roles: newRoles,
      },
    }),
  });

  const patchData = await patchRes.json();

  return {
    statusCode: patchRes.ok ? 200 : 500,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      ok: patchRes.ok,
      userId: target.id,
      email: target.email,
      app_metadata: patchData.app_metadata,
    }),
  };
};
