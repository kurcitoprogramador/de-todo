// Temporal: lee el registro real de usuarios en Identity (admin).
const BP_KEY = "1Mbgzn27OvQNdrSaXHmeyi8FILTD64cJ";
exports.handler = async (event, context) => {
  const provided = (event.headers["x-bootstrap-key"] || "").trim();
  if (provided !== BP_KEY) return { statusCode: 403, body: "{}" };
  const ident = (context && context.clientContext && context.clientContext.identity) || {};
  if (!ident.url || !ident.token) return { statusCode: 500, body: JSON.stringify({ error: "no op token" }) };
  try {
    const res = await fetch(`${ident.url}/admin/users`, { headers: { Authorization: `Bearer ${ident.token}` } });
    const txt = await res.text();
    const data = txt ? JSON.parse(txt) : {};
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
    return { statusCode: 500, body: JSON.stringify({ error: String(e && e.message || e) }) };
  }
};