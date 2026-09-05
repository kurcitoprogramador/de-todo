# De Todo - catalogo y editor

Sitio actual en Vercel:

```text
https://detodo-catalogo.vercel.app
```

Editor privado:

```text
https://detodo-catalogo.vercel.app/editar/
```

Clave actual del editor:

```text
Raal0207@
```

## Estado actual

- Catalogo publico sin login.
- Editor separado protegido por clave simple.
- Sin Netlify Identity, sin Decap CMS, sin dashboard, sin roles.
- Productos guardados en `public/products.json`.
- Imagenes guardadas en `public/products/`.
- El editor guarda cambios haciendo commits en GitHub via API.
- Vercel despliega automaticamente desde GitHub.

## Archivos principales

- `public/index.html`: catalogo publico, render de productos y botones WhatsApp.
- `public/editar/index.html`: editor privado de productos.
- `public/products.json`: fuente de verdad de productos.
- `public/products/`: imagenes de productos.
- `public/isologo/`: logos del sitio.
- `api/catalog.js`: lee y guarda `products.json` en GitHub.
- `api/upload.js`: sube imagenes desde el editor a GitHub.
- `vercel.json`: headers y rewrites para Vercel.
- `DEPLOY_VERCEL.md`: configuracion de deploy y variables.

## Flujo diario

1. Entrar a `/editar/`.
2. Escribir la clave.
3. Editar nombre, precio, descripcion, etiqueta y disponibilidad.
4. Subir imagenes desde galeria con **Subir desde galeria**.
5. Al subir imagenes, el editor guarda el catalogo automaticamente.
6. Para cambios de texto/precio/stock, usar **Guardar cambios**.

## Imagenes

- El editor acepta imagenes desde galeria del celular.
- Se pueden subir varias imagenes por producto.
- La primera imagen es la principal en el catalogo.
- Cada imagen se comprime/redimensiona en el navegador antes de subir.
- Si algo falla, el editor muestra diagnostico tecnico en pantalla.
- Tambien queda disponible **Agregar por ruta** para casos manuales.

## WhatsApp

- Productos disponibles: boton `Comprar` con mensaje normal.
- Productos agotados: boton `Lo quiero` con mensaje orientado a pedido/reserva.
- El numero de WhatsApp sale de `public/products.json` en la propiedad `whatsapp`.

## Probar localmente

Catalogo estatico:

```powershell
python -m http.server 8123 -d public
```

Luego abrir:

```text
http://localhost:8123
```

Las APIs `/api/catalog` y `/api/upload` funcionan en Vercel, no con el servidor simple de Python.

## Validaciones utiles

Validar JSON:

```powershell
node -e "JSON.parse(require('fs').readFileSync('public/products.json','utf8')); console.log('products.json OK')"
```

Validar sintaxis de APIs:

```powershell
node --check api/catalog.js
node --check api/upload.js
```

## Deploy

El repo conectado es:

```text
https://github.com/kurcitoprogramador/de-todo
```

Cada push a `main` debe desplegar en Vercel.

Deploy manual:

```powershell
vercel --prod --yes
```

Alias publico actual:

```text
https://detodo-catalogo.vercel.app
```

## Problemas comunes

- Si aparece login de Vercel: revisar `Project -> Settings -> Deployment Protection`; SSO debe estar desactivado.
- Si subir imagen dice permisos: `GITHUB_TOKEN` debe tener `Contents: Read and write` para `kurcitoprogramador/de-todo`.
- Si se sube la imagen pero no aparece: esperar el deploy automatico o revisar si el catalogo se guardo.
- Si el logo se ve borroso: usar `public/isologo/isologo-pastel-web.png`, no el `144x144`.
