// TEMPORAL — invocación SOLO desde CLI/terminal.
// Corrige el rol del usuario ADMIN en Netlify Identity.
//
//   POST /.netlify/functions/set-role
//   Header: x-bootstrap-key: <BOOTSTRAP_ADMIN_KEY env var>
//
// Reglas:
//   - Solo el email del dueño (TARGET_EMAIL).
//   - Escribe la ruta canónica app_metadata.roles = ["admin"].
//   - Preserva app_metadata.provider y el resto de app_metadata.
//   - NO toca app_metadata.authorization.roles.
//   - Nunca es llamado desde el frontend. Se elimina tras confirmar.

const TARGET_EMAIL = "kurtnarra17@gmail.com";

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
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

  // 1. Buscar al dueño por email
  const listRes = await fetch(`${ident.url}/admin/users?per_page=200`, {
    headers: { Authorization: `Bearer ${ident.token}` },
  });
  const listData = await listRes.json();
  const users = listData.users || [];
  const target = users.find((u) => u.email === TARGET_EMAIL);

  if (!target) {
    return { statusCode: 404, body: JSON.stringify({ error: "Usuario no encontrado", email: TARGET_EMAIL }) };
  }

  // 2. Preservar app_metadata existente y fijar roles canónicos
  const am = target.app_metadata || {};
  const newAppMetadata = {
    ...am,
    roles: ["admin"],
  };
  delete newAppMetadata.authorization;

  // 3. Actualizar el usuario real
  const patchRes = await fetch(`${ident.url}/admin/users/${target.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ident.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ app_metadata: newAppMetadata }),
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