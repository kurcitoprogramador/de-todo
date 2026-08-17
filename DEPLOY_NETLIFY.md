# Publicar en Netlify

Sitio: **De Todo** (catálogo) — URL: https://de-todo-catalogo.netlify.app
Panel de edición: https://de-todo-catalogo.netlify.app/admin/
Panel de estadísticas (dueño): https://de-todo-catalogo.netlify.app/dashboard/
Registro / login: https://de-todo-catalogo.netlify.app/acceso/

---

## Estructura del proyecto

```
romis/
├── public/               # se publica tal cual (publish dir)
│   ├── index.html
│   ├── products.json
│   ├── products/
│   ├── admin/            # Decap CMS
│   ├── acceso/           # registro/login público
│   └── dashboard/        # estadísticas (dueño)
├── netlify/
│   └── functions/        # identity-signup.js, identity-login.js, stats.js
├── netlify.toml          # publish = "public", functions, redirects, roles
└── package.json
```

---

## Probar localmente

Los datos del catálogo se cargan con `fetch`, así que hay que servirlos con
un servidor local (no funciona con doble clic):

```powershell
python -m http.server 8123
# abre http://localhost:8123
```

---

## Setup en Netlify (una sola vez)

### 1. Subir el proyecto a GitHub

```powershell
git init
git add .
git commit -m "Catalogo De Todo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/de-todo.git
git push -u origin main
```

### 2. Conectar Netlify al repo

1. Netlify → Add new site → Import an existing project → GitHub.
2. Elegir el repo `de-todo`.
3. Build command: vacío. Publish directory: `public`.
4. Deploy.

Con esto se reemplaza el deploy manual: cada push a `main` publica
automáticamente.

### 3. Activar Identity (registro abierto)

1. Site settings → Identity → **Enable Identity**.
2. Registration preferences → **Open** (cualquiera puede registrarse).
3. Identity → Services → **Enable Git Gateway** (necesario para el CMS).

### 4. Crear la cuenta del dueño

1. Identity → Add user → correo: `kurtnarra17@gmail.com`
2. Configurar la contraseña (primera vez o invitación).
3. Ir a ese usuario → asignar rol **admin**.

Los editores se crean igual y se les asigna rol **editor**.

**Formato de roles:** en Netlify Identity los roles viven en
`app_metadata.roles` (fuente canónica). NO usar `app_metadata.authorization.roles`
(ese formato es de proveedores JWT externos).

**Ojo:** cambiar un rol no invalida el JWT ya emitido. Tras asignar un rol hay
que cerrar sesión y volver a entrar (o forzar `netlifyIdentity.refresh()`) para
que el token y la cookie `nf_jwt` incluyan el rol nuevo.

### 5. Probar

1. Registrar un usuario en `/acceso` → debería aparecer en `/dashboard`.
2. Entrar a `/admin` con una cuenta con rol `editor` → editar un producto.
3. Entrar a `/dashboard` con la cuenta `admin` → ver las estadísticas.

---

### 6. Correos personalizados (opcional, requiere plan Pro)

El plan gratuito usa los correos estándar de Netlify. Solo si se contrata el
plan Pro se pueden pegar las plantillas de la carpeta `emails/`:
- Site configuration → Identity → **Emails**.
- **Confirmation** → `emails/mensaje-registro.html`
- **Invitation** → `emails/mensaje-invitacion.html`
- **Password recovery** → `emails/mensaje-recuperacion.html`

Ver `emails/README_EMAILS.md`.

---

## Despliegue manual (respaldo, sin repo)

```powershell
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir public
```

---

## Archivos clave

- `index.html`: tienda. Los productos se renderizan en JS leyendo
  `products.json`.
- `products.json`: datos del catálogo (nombre, precio, descripción,
  etiqueta, disponibilidad, foto) + número de WhatsApp.
- `admin/`: panel Decap CMS. Requiere Git Gateway y rol `editor`/`admin`.
- `netlify/functions/*`: registro de actividad y API de estadísticas.
- `netlify.toml`: redirects y control de acceso por rol (`/admin` →
  editor+admin, `/dashboard` → admin).

---

## Nota sobre deprecación de Identity

Netlify anunció (marzo 2025) que **Identity + Git Gateway** se depreca a
futuro; el reemplazo oficial es la extensión Auth0. Mientras siga activo,
este flujo funciona igual. El panel y el dashboard no cambian si se migra a
Auth0.
