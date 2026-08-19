// API de estadísticas del panel /dashboard.
// Solo visible para usuario con rol "admin" (el dueño).
const { getStore } = require("@netlify/blobs");

const STORE = "movimientos";

function rolesOf(user) {
  if (!user) return [];
  const am = user.app_metadata || {};
  if (Array.isArray(am.roles)) return am.roles;
  if (am.authorization && Array.isArray(am.authorization.roles)) return am.authorization.roles;
  return [];
}

exports.handler = async (event, context) => {
  const me = context.clientContext && context.clientContext.user;
  const roles = rolesOf(me);

  if (!roles.includes("admin")) {
    return {
      statusCode: 403,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "No autorizado. Se requiere rol admin." }),
    };
  }

  try {
    const store = getStore({ name: STORE });
    const events = [];
    const listed = await store.list({ paginate: false });
    for (const meta of listed.blobs) {
      if (meta.type !== "json") continue;
      const val = await store.getJSON(meta.key);
      if (val && val.at) events.push(val);
    }

    events.sort((a, b) => (a.at < b.at ? 1 : -1));

    const users = {};
    for (const e of events) {
      if (!users[e.email]) {
        users[e.email] = { email: e.email, roles: e.roles || [], firstActivity: e.at, lastActivity: e.at, signups: 0, logins: 0 };
      }
      users[e.email].lastActivity = e.at;
      if (e.type === "signup") users[e.email].signups++;
      if (e.type === "login") users[e.email].logins++;
    }

    const byType = {};
    const byDay = {};
    for (const e of events) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      const day = (e.at || "").slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }

    const now = Date.now();
    const last7 = events.filter((e) => now - new Date(e.at).getTime() <= 7 * 864e5).length;
    const last30 = events.filter((e) => now - new Date(e.at).getTime() <= 30 * 864e5).length;

    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        totals: { eventos: events.length, usuarios: Object.keys(users).length },
        activity: { last7, last30 },
        byType,
        byDay: Object.entries(byDay).sort().reverse().slice(0, 30),
        users: Object.values(users).sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1)),
        recent: events.slice(0, 50),
      }),
    };
  } catch (err) {
    console.error("stats error:", err);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "No se pudieron leer las estadísticas." }),
    };
  }
};