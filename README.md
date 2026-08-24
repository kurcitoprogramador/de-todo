# De Todo - camino rapido

Este es el mapa corto para arreglar bugs sin perderse en la carpeta.

## Abrir la tienda

Produccion:

```text
https://de-todo-catalogo.netlify.app
```

Local:

```powershell
python -m http.server 8123 -d public
```

Luego abre:

```text
http://localhost:8123
```

## Si falla el catalogo

Revisar en este orden:

1. `public/products.json`: fuente de verdad de productos.
2. `public/products/`: fotos usadas por cada producto.
3. `public/index.html`: render de tarjetas, WhatsApp, visor de fotos y fallback.

Comando rapido para validar el JSON:

```powershell
node -e "JSON.parse(require('fs').readFileSync('public/products.json','utf8')); console.log('products.json OK')"
```

## Si falla el editor

Revisar en este orden:

1. `public/admin/index.html`: carga Decap CMS.
2. `public/admin_config.yml`: campos del editor.
3. `netlify.toml`: redirect de `/admin/config.yml` hacia `/admin_config.yml`.
4. Netlify Identity: el usuario debe tener rol `editor` o `admin`.

Link del editor:

```text
https://de-todo-catalogo.netlify.app/admin/
```

## Si falla acceso o dashboard

Revisar:

1. `public/acceso/index.html`: login y redireccion por rol.
2. `public/dashboard/index.html`: panel del dueño.
3. `netlify/functions/stats.js`: datos del dashboard.
4. `netlify/functions/identity-signup.js` y `identity-login.js`: registro de movimientos.

## Si falla una imagen

1. Verifica que el archivo exista en `public/products/` o `public/isologo/`.
2. Verifica que la ruta en `public/products.json` use exactamente el mismo nombre.
3. Cuidado con acentos y apostrofes: `D’Oscar` no es igual a `D'Oscar`.

## Archivos que importan

- `public/index.html`: tienda publica.
- `public/products.json`: productos, precios, stock, fotos y WhatsApp.
- `public/admin_config.yml`: campos del editor.
- `netlify.toml`: publish dir, funciones y permisos por rol.
- `netlify/functions/`: funciones serverless.
- `FLUJO_PRODUCTOS.md`: operacion diaria.
- `GUIA_EDITOR_PRODUCTOS.md`: como cargar varias fotos por producto.
- `DEPLOY_NETLIFY.md`: publicar y configurar Netlify.
- `ARCHITECTURE.md`: arquitectura completa.

## Deploy

```powershell
netlify deploy --prod
```

## Estado esperado despues de arreglar

- La home muestra productos, no el texto `No se pudo cargar el catalogo`.
- El contador muestra la cantidad de productos.
- Las fotos cargan sin iconos rotos.
- Al tocar una foto, abre el visor.
- `/admin/` carga el editor solo para `editor` o `admin`.
