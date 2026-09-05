# Deploy en Vercel

Estructura simple:

- Catalogo publico: `/`
- Editor privado por clave: `/editar/`
- API de guardado: `/api/catalog`

## Variables en Vercel

En Vercel → Project → Settings → Environment Variables:

- `EDITOR_PASSWORD`: clave que usaran las dos personas para entrar a `/editar/`
- `GITHUB_TOKEN`: token de GitHub con permiso para escribir en `kurcitoprogramador/de-todo`

El token debe poder actualizar `public/products.json` en la rama `main`.

## Publicar

Vercel ya esta conectado al repo `kurcitoprogramador/de-todo`. Cada push a `main` despliega solo.

Si se despliega manualmente:

```powershell
vercel --prod
```

## Uso diario

1. Entrar a `/editar/`.
2. Poner la clave.
3. Editar productos.
4. Guardar.

El editor crea un commit en GitHub y Vercel publica el catalogo actualizado.
