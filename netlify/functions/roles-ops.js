// TEMPORAL: gestión de roles del dueño vía API de Identity. Se eliminará.
const KEY = process.env.ADMIN_OPS_KEY || "";

exports.handler = async (event, context) => {
  const given = (event.headers && event.headers["x-op"]) || "";
  if (!KEY || given !== KEY) {
    return { statusCode: 403, body: JSON.stringify({ error: "forbidden" }) };
  }
  const idt = context.clientContext && context.clientContext.identity;
  if (!idt || !idt.token || !idt.url) {
    return { statusCode: 500, body: JSON.stringify({ error: "no identity context" }) };
  }
  const q = event.queryStringParameters || {};
  const action = q.action || "list";
  const email = (q.email || "").toLowerCase();
  const roles = q.roles ? q.roles.split(",") : ["editor"];

  const list = async () => {
    const r = await fetch(idt.url + "/admin/users", { headers: { Authorization: "Bearer " + idt.token } });
    return r.json();
  };

  try {
    const data = await list();
    const users = (data.users || []).map((x) => ({
      email: x.email,
      id: x.id,
      roles: (x.app_metadata && x.app_metadata.roles) || [],
      confirmed: !!x.confirmed_at,
    }));
    if (action === "list") {
      return { statusCode: 200, body: JSON.stringify({ ok: true, users }) };
    }
    const u = users.find((x) => x.email === email);
    if (!u) {
      return { statusCode: 404, body: JSON.stringify({ ok: false, error: "no-encontrado", email }) };
    }
    const upd = await fetch(idt.url + "/admin/users/" + u.id, {
      method: "PUT",
      headers: { Authorization: "Bearer " + idt.token, "Content-Type": "application/json" },
      body: JSON.stringify({ app_metadata: { roles } }),
    });
    const body2 = await upd.json();
    return { statusCode: 200, body: JSON.stringify({ ok: upd.ok, email, roles, update: body2 }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String((err && err.message) || err) }) };
  }
};