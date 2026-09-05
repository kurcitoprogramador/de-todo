const REPO = "kurcitoprogramador/de-todo";
const BRANCH = "main";
const FOLDER = "public/products";

function authorized(req) {
  const password = process.env.EDITOR_PASSWORD;
  return Boolean(password && req.headers["x-editor-password"] === password);
}

function cleanName(name) {
  const base = String(name || "imagen")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "imagen.jpg";
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo no permitido." });
  if (!authorized(req)) return res.status(401).json({ error: "Clave incorrecta." });

  try {
    const fileName = cleanName(req.body && req.body.name);
    const content = req.body && req.body.content;
    if (!content || typeof content !== "string") return res.status(400).json({ error: "Imagen invalida." });

    const unique = `${Date.now()}-${fileName}`;
    const path = `${FOLDER}/${unique}`;
    await github(path, {
      method: "PUT",
      body: JSON.stringify({
        branch: BRANCH,
        message: `Subir imagen: ${unique}`,
        content,
      }),
    });

    return res.status(200).json({ path: `/products/${unique}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "No se pudo subir la imagen." });
  }
}
