// Evento: deploy completado (legacy por nombre de archivo: deploy-succeeded).
// Cuando un cambio publicado viene del editor de productos (Decap CMS),
// notifica por correo a la dueña usando un Form de Netlify.
export default async (req) => {
  try {
    const { payload } = await req.json();
    const msg = (payload && (payload.commitMessage || payload.title)) || "";
    const isEditorChange = /Agregar producto|Actualizar producto|Eliminar producto|Subir imagen/.test(msg);
    if (!isEditorChange) return;

    const siteUrl = (process.env.URL || "https://de-todo-catalogo.netlify.app").replace(/\/+$/, "");
    const body = new URLSearchParams({
      "form-name": "edicion-producto",
      quien: payload.committer || "Editor",
      detalle: msg,
      rama: payload.context || "production",
      hora: new Date().toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }),
    }).toString();

    await fetch(siteUrl + "/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (err) {
    console.error("deploy-succeeded notify error", err);
  }
};