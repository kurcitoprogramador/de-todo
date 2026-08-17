// Diagnóstico temporal: qué expone Netlify sobre Identity en el runtime.
exports.handler = async (event, context) => {
  const cc = (context && context.clientContext) || {};
  const g = globalThis.netlifyIdentityContext || null;
  const nc = globalThis.Netlify?.context || null;
  return {
    statusCode: 200,
    body: JSON.stringify({
      clientContext_identity: cc.identity || null,
      global_netlifyIdentityContext: g
        ? { url: g.url, hasToken: !!g.token, tokenPrefix: g.token ? g.token.slice(0, 12) : null }
        : null,
      global_Netlify_context: nc
        ? { keys: Object.keys(nc), url: nc.url, identity: nc.identity || null }
        : null,
      env_URL: process.env.URL || null,
    }),
  };
};