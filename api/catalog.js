const REPO = "kurcitoprogramador/de-todo";
const PATH = "public/products.json";
const BRANCH = "main";

function authorized(req) {
  const password = process.env.EDITOR_PASSWORD;
  const provided = req.headers["x-editor-password"];
  return Boolean(password && provided && provided === password);
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Falta GITHUB_TOKEN en Vercel.");
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `GitHub HTTP ${res.status}`);
  return json;
}

function decodeBase64(value) {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

function encodeBase64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ error: "Clave incorrecta." });
  }

  try {
    if (req.method === "GET") {
      const file = await github(`${PATH}?ref=${BRANCH}`);
      return res.status(200).json({ data: JSON.parse(decodeBase64(file.content)), sha: file.sha });
    }

    if (req.method === "PUT") {
      const data = req.body && req.body.data;
      if (!data || !Array.isArray(data.products)) {
        return res.status(400).json({ error: "Formato invalido." });
      }

      const current = await github(`${PATH}?ref=${BRANCH}`);
      const content = JSON.stringify(data, null, 2) + "\n";
      const saved = await github(PATH, {
        method: "PUT",
        body: JSON.stringify({
          branch: BRANCH,
          message: "Actualizar catalogo desde editor",
          content: encodeBase64(content),
          sha: current.sha,
        }),
      });
      return res.status(200).json({ ok: true, commit: saved.commit && saved.commit.sha });
    }

    return res.status(405).json({ error: "Metodo no permitido." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "No se pudo guardar." });
  }
}
