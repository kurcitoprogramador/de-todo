// Validación de los diagramas Mermaid de arquitectura-visual.html en un navegador real.
// Uso:
//   cd tools
//   npm install          # instala mermaid + puppeteer-core (una sola vez)
//   node check-mermaid.js ..\arquitectura-visual.html
// Requiere Microsoft Edge o Chrome instalado. Devuelve OK/ERROR por cada diagrama.
const puppeteer = require("puppeteer-core");
const http = require("http");
const fs = require("fs");
const path = require("path");

const mermaidPath = process.argv[2];
if (!mermaidPath) {
  console.error("Uso: node check-mermaid.js <ruta a arquitectura-visual.html>");
  process.exit(2);
}
const htmlPath = path.resolve(mermaidPath);

const browserCandidates = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];
const browserPath = browserCandidates.find(p => fs.existsSync(p));
if (!browserPath) {
  console.error("No se encontró Edge/Chrome. Edita browserCandidates en check-mermaid.js");
  process.exit(2);
}

const root = path.resolve(path.join(__dirname, "node_modules"));

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<!doctype html><html><body>ok</body></html>");
    return;
  }
  const file = path.join(root, u.replace(/^\//, ""));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("nf"); return; }
    const ct = /\.(js|mjs)$/.test(u) ? "text/javascript" : "application/octet-stream";
    res.writeHead(200, { "Content-Type": ct });
    res.end(data);
  });
});

(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("pageerror:", e.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
  const blocks = [...fs.readFileSync(htmlPath, "utf8").matchAll(/<pre class="mermaid">\s*([\s\S]*?)<\/pre>/g)].map(m => m[1].trim());
  console.log("Diagramas encontrados:", blocks.length);
  let fail = 0;
  for (let i = 0; i < blocks.length; i++) {
    const src = `http://127.0.0.1:${port}/mermaid/dist/mermaid.esm.min.mjs`;
    const code = blocks[i];
    const ok = await page.evaluate(async (src, diag) => {
      try {
        const mermaid = await import(src);
        await mermaid.default.initialize({ startOnLoad: false });
        await mermaid.default.parse(diag);
        return { ok: true };
      } catch (err) {
        return { ok: false, msg: err && (err.message || err.str || String(err)) };
      }
    }, src, code);
    if (ok.ok) { console.log(`[${i + 1}] OK`); }
    else { fail++; console.log(`[${i + 1}] ERROR -> ${ok.msg}`); }
  }
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
})();