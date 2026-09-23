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
  if (res.status === 403 && /Resource not accessible by personal access token/i.test(json.message || "")) {
    throw new Error("El GITHUB_TOKEN no tiene permiso de escritura. En GitHub debe tener Contents: Read and write para kurcitoprogramador/de-todo.");
  }
  if (!res.ok) throw new Error(json.message || `GitHub HTTP ${res.status}`);
  return json;
}

function decodeBase64(value) {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}

function encodeBase64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

const TEXT_FIXES = [
  ["ar?ndano", "arándano"], ["c?lido", "cálido"], ["?mbar", "ámbar"], ["pi?a", "piña"],
  ["ar�ndano", "arándano"], ["c�lido", "cálido"], ["�mbar", "ámbar"], ["pi�a", "piña"],
  ["Loci?n", "Loción"], ["loci?n", "loción"], ["?Energiza", "¡Energiza"], ["f?rmula", "fórmula"],
  ["presentaci?n", "presentación"], ["r?pida", "rápida"], ["duraci?n", "duración"], ["Edici?n", "Edición"],
  ["presentaci�n", "presentación"], ["r�pida", "rápida"], ["duraci�n", "duración"], ["Edici�n", "Edición"],
  ["?Ll?vate", "¡Llévate"], ["dif?cil", "difícil"], ["combinaci?n", "combinación"], ["rom?ntico", "romántico"],
  ["D?jate", "Déjate"], ["seg?n", "según"], ["dise?o", "diseño"], ["ic?nica", "icónica"],
  ["D�jate", "Déjate"], ["seg�n", "según"], ["dise�o", "diseño"], ["Dise?o", "Diseño"], ["Dise�o", "Diseño"], ["ic�nica", "icónica"],
  ["Dise?ado", "Diseñado"], ["Dise�ado", "Diseñado"],
  ["cl?sico", "clásico"], ["extra?ble", "extraíble"], ["vers?til", "versátil"], ["met?lica", "metálica"],
  ["convirti?ndolo", "convirtiéndolo"], ["pr?ctico", "práctico"], ["c?moda", "cómoda"], ["d?a", "día"],
  ["N?utica", "Náutica"], ["n?utico", "náutico"], ["ic?nicas", "icónicas"], ["pedrer?a", "pedrería"],
  ["marr?n", "marrón"], ["c?modo", "cómodo"], ["tama?o", "tamaño"], ["?El accesorio", "¡El accesorio"],
  ["marr�n", "marrón"], ["c�modo", "cómodo"], ["tama�o", "tamaño"], ["�El accesorio", "¡El accesorio"],
  ["d?as", "días"], ["met?lico", "metálico"], ["Mu?equera", "Muñequera"], ["mu?eca", "muñeca"],
  ["d�as", "días"], ["met�lico", "metálico"], ["Mu�equera", "Muñequera"], ["mu�eca", "muñeca"],
  ["?Perfecta", "¡Perfecta"], ["C?modas", "Cómodas"], ["cl?sicas", "clásicas"], ["r?pidos", "rápidos"],
  ["�Perfecta", "¡Perfecta"], ["C�modas", "Cómodas"], ["cl�sicas", "clásicas"], ["r�pidos", "rápidos"],
  ["cer?mica", "cerámica"], ["c?lidas", "cálidas"], ["protecci?n", "protección"], ["Marr?n", "Marrón"],
  ["cer�mica", "cerámica"], ["c�lidas", "cálidas"], ["protecci�n", "protección"], ["Marr�n", "Marrón"],
  ["ocasi?n", "ocasión"], ["ocasi�n", "ocasión"], ["ic?nico", "icónico"], ["ic�nico", "icónico"],
  ["armaz?n", "armazón"], ["armaz�n", "armazón"], ["cintur?n", "cinturón"], ["cintur�n", "cinturón"],
  ["distinci?n", "distinción"], ["distinci�n", "distinción"], ["pr?ctica", "práctica"], ["pr�ctica", "práctica"],
];

function fixText(value) {
  if (typeof value === "string") {
    for (const [bad, good] of TEXT_FIXES) value = value.split(bad).join(good);
    return value;
  }
  if (Array.isArray(value)) return value.map(fixText);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) value[key] = fixText(value[key]);
  }
  return value;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const file = await github(`${PATH}?ref=${BRANCH}`);
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(200).json({ data: fixText(JSON.parse(decodeBase64(file.content))), sha: file.sha });
    }

    if (!authorized(req)) {
      return res.status(401).json({ error: "Clave incorrecta." });
    }

    if (req.method === "PUT") {
      const data = fixText(req.body && req.body.data);
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
