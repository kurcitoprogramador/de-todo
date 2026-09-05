# Deploy en Vercel

## Proyecto

- Vercel project: `simone-weils/romis`
- Repo GitHub: `kurcitoprogramador/de-todo`
- Branch: `main`
- Alias publico: `https://detodo-catalogo.vercel.app`
- Output directory: `public`

## Estructura

- `/`: catalogo publico.
- `/editar/`: editor privado por clave.
- `/api/catalog`: leer/guardar `public/products.json`.
- `/api/upload`: subir imagenes a `public/products/`.

## Variables de entorno

En Vercel -> Project -> Settings -> Environment Variables:

- `EDITOR_PASSWORD`: clave para entrar al editor.
- `GITHUB_TOKEN`: fine-grained personal access token de GitHub.

Permisos minimos del `GITHUB_TOKEN`:

- Resource owner: `kurcitoprogramador`.
- Repository access: `Only select repositories` -> `de-todo`.
- Repository permissions -> `Contents` -> `Read and write`.
- `Metadata` queda `Read-only` automaticamente.

## Deploy automatico

Vercel esta conectado a GitHub. Cada commit en `main` dispara deploy.

Si Vercel falla con schema de `vercel.json`, revisar que no exista la propiedad antigua:

```json
"public": true
```

Esa propiedad no es valida y ya fue eliminada.

## Deploy manual

```powershell
vercel --prod --yes
```

Si Vercel crea un alias temporal `romis-nine.vercel.app`, reapuntar el alias publico:

```powershell
vercel alias set <deployment-url> detodo-catalogo.vercel.app
vercel alias rm romis-nine.vercel.app --yes
```

## Proteccion Vercel

El sitio publico no debe pedir login de Vercel.

Ver estado:

```powershell
vercel project protection romis --json
```

Desactivar SSO si aparece activo:

```powershell
vercel project protection disable romis --sso
```

## Prueba de API

Leer catalogo:

```powershell
$headers = @{ 'x-editor-password' = 'TU_CLAVE'; 'Content-Type' = 'application/json' }
Invoke-RestMethod -Uri "https://detodo-catalogo.vercel.app/api/catalog" -Headers $headers -Method Get
```

Subir imagen de prueba:

```powershell
$headers = @{ 'x-editor-password' = 'TU_CLAVE'; 'Content-Type' = 'application/json' }
$body = @{ name = 'test.png'; content = '<BASE64>' } | ConvertTo-Json
Invoke-RestMethod -Uri "https://detodo-catalogo.vercel.app/api/upload" -Headers $headers -Method Post -Body $body
```

## Flujo del editor

1. `/editar/` pide clave.
2. `GET /api/catalog` lee `public/products.json` desde GitHub.
3. Subir imagen desde galeria llama a `POST /api/upload`.
4. La imagen se comprime en el navegador antes de subir.
5. `api/upload` crea un commit con la imagen en `public/products/`.
6. El editor agrega la ruta al producto.
7. El editor guarda automaticamente el catalogo con `PUT /api/catalog`.
8. `api/catalog` crea un commit actualizando `public/products.json`.
9. Vercel despliega el cambio de GitHub.
