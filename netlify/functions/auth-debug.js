// TEMPORAL — diagnóstico: qué usuario/roles ve Netlify en esta petición
// (vía cookie nf_jwt). Sin protección de rol; solo revela datos del propio
// peticionante. Se elimina cuando se confirme el acceso.

exports.handler = async (event, context) => {
  const cc = context.clientContext || {};
  const me = cc.user || null;
  const am = (me && me.app_metadata) || {};
  const roles = Array.isArray(am.roles)
    ? am.roles
    : am.authorization && Array.isArray(am.authorization.roles)
      ? am.authorization.roles
      : [];
  const cookies = (event.headers && event.headers.cookie) || "";
  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      hasUser: !!me,
      email: (me && me.email) || null,
      roles,
      hasNfJwtCookie: /nf_jwt=/.test(cookies),
      hasAnyCookie: !!cookies,
    }),
  };
};