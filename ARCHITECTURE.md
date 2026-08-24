# ARQUITECTURA — De Todo · Catálogo Electrónico

> **Documento:** Arquitectura técnica y operativa del proyecto.
> **Versión:** 2.1 — Refleja el estado actual desplegado.
> **Fecha:** 17 de agosto de 2026.
> **Estado:** Estable · Producción activa.
> **Repositorio:** `kurcitoprogramador/de-todo` — rama `main`.
> **Sitio:** <https://de-todo-catalogo.netlify.app>

---

## Contenido

1. Resumen ejecutivo
2. Principios y decisiones arquitectónicas (ADR)
3. Arquitectura de contexto (C4 · L1)
4. Arquitectura de contenedores (C4 · L2)
5. Estructura del repositorio
6. Modelo de identidad, roles y autorización
7. Modelo de datos
8. Flujos funcionales (runtime)
9. Superficie de API
10. Despliegue y CI/CD
11. Seguridad (defensa en profundidad)
12. Notificaciones y observabilidad
13. Atributos no funcionales
14. Modos de fallo y runbook operativo
15. Limitaciones y evolución
16. Mapa visual de la arquitectura
17. Glosario

---

## 1. Resumen ejecutivo

«De Todo» es un **catálogo de productos** tipo boutique, 100 % hospedado en
**Netlify**, con tres superficies funcionales:

| Superficie | Ruta | Audiencia | Permiso |
|---|---|---|---|
| Tienda pública | `/` | Cualquier visitante | Público |
| Editor de catálogo (Decap CMS) | `/admin/` | `editor` y `admin` | Condicionado por rol |
| Panel de estadísticas | `/dashboard/` | `admin` (Kurt) | Condicionado por rol |
| Acceso (login/registro) | `/acceso/` | Público | Público |

**Decisiones de fondo:**

- **Arquitectura serverless-first**: sitio estático + funciones Netlify.
  Sin servidor ni base de datos propios.
- **Catálogo gobernado por Git**: el contenido vive en `public/products.json`
  y se administra con un CMS que hace *commit* al repositorio. Git es la
  fuente de verdad y el historial de contenido.
- **Telemetría ligera con Netlify Blobs**: las altas e ingresos de usuarios
  se persisten en un *store* de blobs clave→JSON sin infraestructura extra.
- **Autorización en dos capas**: el *edge* (redirects por rol) más su
  verificación **server-side** en la función (`stats.js`). Defensa en
  profundidad.
- **Notificación por correo sin servicios externos**: los formularios de
  Netlify con detección automática se usan como canal de email hacia la
  cuenta de Kurt para cada registro nuevo y cada edición de producto.

---

## 2. Principios y decisiones arquitectónicas

| # | Decisión | Justificación | Estado |
|---|---|---|---|
| ADR-01 | Catálogo estático en `public/` publicado tal cual (`publish = "public"`) | Cero build-time, deploys rápidos, cacheable | ✅ |
| ADR-02 | Roles canónicos en `app_metadata.roles` (Netlify Identity) | Formato estándar que el edge y las funciones comprenden | ✅ |
| ADR-03 | `app_metadata.authorization.roles` solo lectura (compatibilidad) | No es formato de escritura de este proyecto | ✅ |
| ADR-04 | Autorización edge + función (`stats.js`) | Uno de los dos puede fallar; nunca dejar el dato expuesto | ✅ |
| ADR-05 | Telemetría en Netlify Blobs (store `movimientos`) | Sin BD externa; económico; SDK oficial `@netlify/blobs` | ✅ |
| ADR-06 | Eventos de Identity por convención *legacy* de archivo (`identity-*.js`) | Soporte vigente y de menor fricción que handlers tipados | ✅ |
| ADR-07 | Renovación real de sesión con `user.jwt(true)` (refresco forzado) | `refresh()` + sesión restaurada de `localStorage` pueden reutilizar un JWT antiguo **sin roles**; el forzado acuña token nuevo y renueva la cookie `nf_jwt` vía `X-Use-Cookie` | ✅ |
| ADR-08 | Notificaciones vía **Formularios Netlify** (detección + email a la cuenta de Kurt) | Gratis, sin API keys externas; cupo ~100 envíos/mes en plan gratuito | ✅ |
| ADR-09 | `deploy-succeeded` como **función de evento** para avisar cada publicación | El pipeline publica solo desde Git; el evento es el punto de sincronización natural | ✅ |
| ADR-10 | Detección de formularios habilitada vía `processing_settings.ignore_html_forms=false` | Netlify la desactiva por defecto en sitios creados por API | ✅ |

---

## 3. Arquitectura de contexto (C4 · L1)

```
                    ┌──────────────────────────────────────────┐
                    │                  Visitante                │
                    │   (cliente, navegador móvil o de escritorio)│
                    └─────────────────┬────────────────────────┘
                                     │ HTTPS
                                     ▼
       ┌────────────────────────────────────────────────────────────┐
       │                         NETLIFY                            │
       │                                                            │
       │   Edge / CDN  ── redirects por rol ──  sitios estáticos    │
       │   Identity    ── login / registro / JWT / cookies          │
       │   Functions   ── eventos + APIs (serverless)               │
       │   Forms       ── canal de email y recepción de notificaciones│
       │   Blobs       ── store "movimientos"                       │
       │                                                            │
       └───┬──────────────┬───────────────┬───────────────┬────────┘
           │              │               │               │
           ▼              ▼               ▼               ▼
┌─────────┐   ┌──────────┐   ┌───────────┐   ┌──────────────┐
   │ GitHub  │   │ WhatsApp │   │ Correo de │   │ Git Gateway  │
   │ (repo + │   │ (compra: │   │   Kurt    │   │ (puente Git- │
   │  historial│   │  wa.me/  │   │ (avizos)  │   │  CMS→GitHub)│
   └─────────┘   └──────────┘   └───────────┘   └──────────────┘
```

**Actores**

- **Visitante anónimo**: navega la tienda; puede registrarse.
- **Registrado (sin rol)**: ve la tienda; su registro queda en telemetría.
- **Editor (`editor`)**: administra productos en `/admin/`.
- **Kurt (`admin`)**: edita productos y consulta `/dashboard/`.
- **Sistema/CI**: GitHub, Netlify Build y la extensión de email de Forms.

---

## 4. Arquitectura de contenedores (C4 · L2)

```
┌─────────────────────────────── PUBLIC / ─────────────────────────────┐
│  static site (HTML+CSS+JS vanilla, sin framework de build)           │
│  ├─ index.html            Tienda: render de products.json + WA + forms│
│  ├─ acceso/index.html     Login/registro + tarjeta de sesión          │
│  ├─ dashboard/index.html  Consumo de stats.js (Bearer/cookie)         │
│  ├─ admin/index.html      Host del Decap CMS (CDN) + CSS táctil       │
│  └─ dashboard-negado.html Aviso 403 amigable                          │
├────────────────────────────── FUNCTIONS ─────────────────────────────┤
│  ├─ identity-signup.js    (evento) registrar alta + notificar email   │
│  ├─ identity-login.js     (evento) registrar ingreso                  │
│  ├─ stats.js              (API) datos del dashboard, rol admin        │
│  └─ deploy-succeeded.js   (evento v2/ESM) aviso de publicación        │
├────────────────────────────── DATA ───────────────────────────────────┤
│  ├─ public/products.json   Catálogo (via CMS + Git)                   │
│  └─ Blobs store "movimientos"  Alta/ingreso (opcional: extender)      │
└────────────────────────────────────────────────────────────────────────┘
```

Tecnologías:

- **Frontend**: HTML5 + CSS3 nativa + JavaScript vanilla (sin framework,
  sin transpilación). Fuentes Google (Cormorant Garamond + Outfit).
- **CMS**: Decap CMS 3.x desde CDN (`unpkg`), backend `git-gateway`.
- **Runtime de funciones**: Node.js 18+ en Netlify; SDKs `@netlify/blobs`
  y `@netlify/identity` (este último disponible para migraciones futuras).
- **Au**: Netlify Identity + Git Gateway + Widget Identity clásico
  (`identity.netlify.com/v1/netlify-identity-widget.js`).

---

## 5. Estructura del repositorio

```
romis/
├── public/                        # publish dir: se sube tal cual
│   ├── index.html                 # Tienda (render, WhatsApp, forms ocultos)
│   ├── products.json              # Catálogo (fuente de verdad de contenido)
│   ├── products/                  # Fotografías (media_folder del CMS)
│   ├── isologo/                   # Logotipos activos
│   ├── favicon.ico
│   ├── admin/                     # Decap CMS
│   │   └── index.html             #   bootstrap + CSS táctil (iPhone/Android)
│   ├── admin_config.yml           # Config Decap CMS (servido como /admin/config.yml)
│   ├── acceso/                    # Gate de autenticación
│   │   └── index.html
│   ├── dashboard/                 # Estadísticas (Kurt)
│   │   └── index.html
│   └── dashboard-negado.html      # Aviso de acceso restringido
├── netlify/
│   └── functions/
│       ├── identity-signup.js     # Evento: alta → blob + email a Kurt
│       ├── identity-login.js      # Evento: ingreso → blob
│       ├── stats.js               # API stats (rol admin, Blobs)
│       └── deploy-succeeded.js    # Evento: publicación → email a Kurt
├── emails/                        # Plantillas Identity (requiere plan Pro)
├── netlify.toml                   # Build, funciones, redirects y roles
├── package.json                   # Dependencias de funciones
├── DEPLOY_NETLIFY.md              # Guía de puesta en marcha
├── FLUJO_PRODUCTOS.md             # Guía operativa del negocio
├── GUIA_EDITOR_PRODUCTOS.md       # Guía rápida para editoras
├── arquitectura-visual.html       # Mapa visual Mermaid (imprime/mira en navegador)
└── ARCHITECTURE.md                # Este documento
```

> `node_modules/` y `.netlify/` son recursos locales de trabajo, no artefactos
> del sitio.

---

## 6. Modelo de identidad, roles y autorización

### 6.1 Fuente canónica

Los roles viven en `app_metadata.roles` (array de cadenas):

```json
{ "app_metadata": { "roles": ["admin"] } }
```

Lectura de compatibilidad (no escritura): `app_metadata.authorization.roles`.

### 6.2 Matriz de acceso

| Rol | `/` tienda | `/acceso/` | `/admin/` | `/dashboard/` | `stats.js` |
|---|---|---|---|---|---|
| anónimo | ✅ | ✅ | 🚫 (home) | 🚫 (negado) | 403 |
| sin rol | ✅ | ✅ | 🚫 (home) | 🚫 (negado) | 403 |
| `editor` | ✅ | ✅ | ✅ | 🚫 (negado) | 403 |
| `admin` | ✅ | ✅ | ✅ (edge) | ✅ edge + función | 200 |

### 6.3 Ciclo de sesión

1. El Widget Identity restaura la sesión de `localStorage` o lanza login.
2. La página de acceso pide **JWT fresco** con `currentUser().jwt(true)`:
   fuerza un `POST /token` (grant `refresh_token`) que **acuña un token nuevo
   con los roles actuales** y, vía cabecera `X-Use-Cookie`, **renueva la
   cookie `nf_jwt`** por servidor.
3. `getUserData()` refresca `app_metadata` desde el servidor (no confiar en
   `localStorage`).
4. El edge lee los roles del JWT de la cookie para decidir los redirects.

> **Regla operativa:** tras asignar un rol hay que cerrar sesión y volver a
> entrar (o entrar a `/acceso/`, que fuerza el refresco) para que el token y
> la cookie incluyan el rol nuevo. Este proyecto ya automatiza ese refresco.

### 6.4 Asignación de roles

- **UI oficial**: `app.netlify.com → de-todo-catalogo → Identity → usuario →
  Edit → Roles` (escribir `editor`, `admin`, o dejar vacío para solo lectura).
- **API (temporales retirados)**: funciones protegidas con secreto en env var;
  se usaron puntualmente y se eliminaron. **Producción actual de usuarios:**

| Correo | Rol | Estado |
|---|---|---|
| `kurtnarra17@gmail.com` | `admin` | Confirmado |
| `raal027@gmail.com` | `editor` | Confirmado |
| `hackwolfteam123456@gmail.com` | sin rol | Confirmado |
| `kurtmolly123123@gmail.com` | sin rol | Sin confirmar |

---

## 7. Modelo de datos

### 7.1 Catálogo — `public/products.json`

```json
{
  "whatsapp": "51961841885",
  "products": [
    {
      "name": "Bruma Festive Fizz",
      "price": 46,
      "description": "Bruma corporal fresca y ligera...",
      "tag": "Nuevo",
      "availability": "disponible",
      "image": "products/Bruma festive fizz Vs.jpg"
    }
  ]
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `whatsapp` | string | Número destino de compras (solo dígitos). |
| `name` | string | Nombre del producto. |
| `price` | number | Precio en soles (moneda `S/`). |
| `description` | string | Texto corto. |
| `tag` | string | Opcional: Perfume, Bolso, Calzado, Nuevo… |
| `availability` | enum | `disponible` · `pocas` · `agotado`. |
| `image` | string | Ruta dentro de `public/products/`. |

### 7.2 Telemetría — Blobs `movimientos`

Eventos `signup` / `login`. Claves: `<tipo>:<timestamp>:<uid_random>`.

```json
{ "type": "signup", "email": "a@x.com", "userId": "uuid", "at": "ISO", "roles": [] }
```

`stats.js` agrega: totales, actividad 7/30 d, `byType`, `byDay` (14),
tabla de usuarios (correo, rol, ingresos, última actividad) y movimientos
recientes (50).

### 7.3 Notificaciones — Forms Netlify

Dos formularios ocultos en `index.html` (requisito: detección de formularios
**habilitada**; ver ADR-10):

| Form | Campos | Cuándo se envía |
|---|---|---|
| `nueva-cuenta` | `nombre`, `email`, `hora` | Alta de un usuario (desde `identity-signup.js`) |
| `edicion-producto` | `quien`, `detalle`, `rama`, `hora` | Cada publicación del editor (desde `deploy-succeeded.js`) |

Netlify convierte cada envío en un registro y un **email a la cuenta de
Kurt** (asunto del tipo `New submission: edicion-producto`). En plan
gratuito el cupo es ~100 envíos/mes.

---

## 8. Flujos funcionales (runtime)

### 8.1 Tienda

```
GET / ────────────────────────────────────────────────► index.html
  fetch /products.json ──────────────────────────────► catálogo
  render cards (foto, tag, stock, precio S/)
  botón "Comprar" ── wa.me/51...?text=Hola, me interesa <producto>
```

### 8.2 Registro y login

```
/acceso/ → widget (email+password)
   │
   ├─ REGISTRO: submit → Identity "Open signup"
   │     │ email de confirmación (marcadores {{ confirmation_url }})
   │     └── evento userSignup (legacy identity-signup.js)
   │            ├─ blob signup {type,email,userId,at,roles}
   │            └─ notifyNewUser → POST form "nueva-cuenta" → email a Kurt
   │
   └─ LOGIN: credentials/fresh → Identity emite JWT + cookie nf_jwt
         └── evento userLogin (legacy identity-login.js) → blob login
```

### 8.3 Edición de productos (Decap CMS)

```
/editor/ → /admin/ (redirect por rol editor+admin)
   Decap CMS ── git-gateway ── commit a rama cms/* (borrador "Guardar")
   "Publicar" → merge a main ──► Netlify Build ──► public/* listo (≈1 min)
```

- **Guardar** = borrador (rama `cms/...`). **Publicar** = merge a `main`.
  El sitio visible solo refleja lo **publicado**.
- Media: las fotos van a `public/products/` y quedan referenciadas en
  `products.json`.

### 8.4 Aviso por correo de cada edición

```
merge a main → build → deploySucceeded (evento) ── deploy-succeeded.js
   filtra commit: /Agregar producto|Actualizar producto|Eliminar producto|Subir imagen/
   → POST form "edicion-producto" → email a Kurt
```

### 8.5 Panel de estadísticas

```
/dashboard/ (redirect por rol admin, fallback dashboard-negado.html)
   dashboard/index.html
     1) jwt(true) [refresco forzado] → GET stats con Bearer
     2) si falla → GET stats sin header (auth por cookie nf_jwt)
   stats.js → valida rol admin (clientContext.user) → lee Blobs → JSON
   render: cards, gráfico 14 d, tabla de usuarios, movimientos recientes
```

---

## 9. Superficie de API

| Endpoint | Método | Acceso | Propósito |
|---|---|---|---|
| `/.netlify/functions/stats` | GET | `admin` | Estadísticas del dashboard. 403 si no admin; 500 si falla Blobs. |
| Form `nueva-cuenta` en `/` | POST | público (interno) | Recibir alta y generar email. |
| Form `edicion-producto` en `/` | POST | público (interno) | Recibir aviso de edición y generar email. |
| `/admin/config.yml` | GET | público | Configuración del CMS (sin datos sensibles). |

> Funciones temporales `set-role`, `identity-check`, `auth-debug`,
> `roles-ops` y el diagnóstico `/acceso/` se **eliminaron** de producción.

---

## 10. Despliegue y CI/CD

### 10.1 netlify.toml

```toml
[build]
  publish = "public"
  functions = "netlify/functions"

[[redirects]]                 # /admin/config.yml se sirve tal cual (el CMS lo
  from = "/admin/config.yml"  # pide como archivo; debe ir ANTES del redirect)
  to = "/admin/config.yml"
  status = 200

[[redirects]]                 # /admin → solo editor+admin
  from = "/admin/*"
  to = "/admin/index.html"
  status = 200
  force = true
  conditions = { Role = ["editor", "admin"] }

[[redirects]]                 # /admin sin rol → home (SPA)
  from = "/admin/*"
  to = "/index.html"
  status = 200
  force = true

[[redirects]]                 # /dashboard → solo admin
  from = "/dashboard/*"
  to = "/dashboard/index.html"
  status = 200
  force = true
  conditions = { Role = ["admin"] }

[[redirects]]                 # /dashboard sin admin → aviso
  from = "/dashboard/*"
  to = "/dashboard-negado.html"
  status = 200
  force = true

[[redirects]]                 # /acceso siempre público
  from = "/acceso/*"
  to = "/acceso/index.html"
  status = 200

[[redirects]]                 # resto → home (SPA-friendly)
  from = "/*"
  to = "/index.html"
  status = 200
```

### 10.2 Pipeline

```
push main / merge CMS ──► Netlify Build (sin command) ──► publish public
   │
   ├─ detecta funciones (netlify/functions) + bundle (esbuild)
   ├─ detecta formularios (detección habilitada vía API)
   └─ al terminar ──► evento deploySucceeded
```

### 10.3 Configuración de sitio (actual)

| Ítem | Valor |
|---|---|
| Identity | Habilitado, registro **Open** |
| Git Gateway | Habilitado (backend del CMS) |
| Form detection | `ignore_html_forms = false` (habilitada vía API) |
| Env vars | Ninguna (se retiraron `BOOTSTRAP_ADMIN_KEY`, `ADMIN_OPS_KEY`) |
| Repo | `kurcitoprogramador/de-todo`, rama `main` |
| Emails personalizados | Carpeta `emails/` disponible (plan Pro) |

---

## 11. Seguridad (defensa en profundidad)

1. **Edge por rol**: redirects condicionales para `/admin/` y `/dashboard/`.
2. **Función `stats.js`**: valida el rol **de nuevo** en el servidor; 403 sin
   él. Un redirect equivocado no expone datos.
3. **Cookie `nf_jwt`**: HttpOnly, administrada por Netlify; el frontend nunca
   la escribe ni la lee (`document.cookie` no es prueba de sesión).
4. **No se confía en `localStorage`**: siempre `getUserData()` + `jwt(true)`.
5. **Secreto de funciones temporales**: solo en env var, nunca en el repo;
   las herramientas de gestión se desplegaron y retiraron.
6. **Sin secretos en el frontend**: ni tokens ni claves en HTML/JS públicos.
7. **Form endpooints**: sirven config pública y recepción de envíos sin datos
   sensibles; el email va únicamente a la cuenta de Kurt.
8. **`robots noindex`** en páginas privadas (`/admin`, `/dashboard`,
   `/acceso`, `dashboard-negado`).

---

## 12. Notificaciones y observabilidad

- **Email a Kurt**:
  - Registro nuevo → `nueva-cuenta`.
  - Publicación del editor → `edicion-producto`.
- **Dashboard** (`/dashboard/`): métricas de actividad de Identity.
- **Logs**: `console.error` en funciones; funciones con `system log
  accessible` en el panel de funciones de Netlify.
- **Seguimiento de deploys**: panel Deploys de Netlify (último commit
  `HEAD` de `main`).

---

## 13. Atributos no funcionales

| Atributo | Estrategia |
|---|---|
| Rendimiento | Sitio 100 % estático, caching del CDN, imágenes `loading="lazy"`. |
| Movilidad | CSS responsive + override táctil en `/admin/` (36–44 px, sin zoom iOS en inputs). |
| Costo | Plan gratuito Netlify (funciones, Blobs, Identity+, Forms por cupo). |
| Disponibilidad | Planaforma gestionada; deploys atómicos. |
| Mantenibilidad | JS vanilla, sin pipeline de build, variables simples. |

---

## 14. Modos de fallo y runbook

| Síntoma | Causa probable | Acción |
|---|---|---|
| "Acceso restringido" tras asignar rol | JWT/cookie antiguos sin el rol | Entrar a `/acceso/` (fuerza `jwt(true)`) o cerrar sesión y reingresar. |
| "No hay datos" en `/dashboard/` | Token viejo sin roles / red / Nets | Reintentar; el panel hace fallback cookie→header. Revisar logs de `stats.js`. |
| Cambio no se ve en la tienda | Solo se hizo **Guardar** (borrador) | Publicar (merge) en el CMS; ~1 min. |
| No llegan correos de Forms | Detección desactivada / cupo 100/mes | Verificar `Form detection` en UI; revisar cupo. |
| CMS no carga config | `/admin/config.yml` interceptado | La regla passthrough ya precede al redirect por rol (ver §10.1). |
| DNS/API transitorios | Red de la zona | Reintentar; es ajeno al sitio. |

---

## 15. Limitaciones y evolución

1. **Cupo Forms (free)**: ~100 emails/mes. Si crece el número de registros,
   migrar a un proveedor SMTP (Resend/SendGrid) desde las funciones.
2. **Correos personalizados de Identity**: requieren plan Pro (plantillas en
   `emails/`).
3. **Deprecación anunciada de Identity + Git Gateway** (marzo 2025): el
   reemplazo oficial es la extensión **Auth0**. El frontend (widget →
   `auth-client`, y alojamiento de sessions) y las funciones `stats.js` se
   conservan; solo cambiaría el método de autenticación y la lectura de roles
   (`getUser()` de `@netlify/identity` ya está disponible en `package.json`).
4. **Dominio propio / HTTPS custom**: pendiente; actualmente en subdominio
   `*.netlify.app`.
5. **Extender telemetría**: `userModified`, `userDeleted`, `userValidate`
   (bloqueo por dominio) son adiciones triviales al mismo patrón.

---

## 16. Mapa visual de la arquitectura

Además de este documento técnico, el proyecto incluye un **mapa visual**
(`arquitectura-visual.html`) pensado para verse en el navegador (o imprimirse)
sin conocimientos técnicos. Se abre con doble clic, no necesita servidor ni
deploy. Cubre:

1. Tienda pública (visitante, Kurt y editora → CDN/Forms/GitHub).
2. Rol por persona (matriz rápida).
3. Registro e ingreso de usuarios.
4. Catálogo: edición por CMS y publicación a `main`.
5. Avisos por correo automáticos (registros y ediciones).
6. Panel de estadísticas (solo Kurt, rol `admin`).

Los diagramas usan **Mermaid** (al cargar vía CDN de jsdelivr). Reglas de
mantenimiento:

- No romper la sintaxis al editar: los nodos y sus etiquetas deben validarse.
- Los errores típicos ya corregidos: nodos cuyo **id** no empieza con número
  (ej. `403` → `R403`), etiquetas con comillas simples, y **paréntesis dentro de
  una etiqueta** (ej. `jwt(true)` debe ir entre comillas:
  `["Renueva token<br/>jwt(true)"]`).
- Al abrir el archivo en un navegador, si un diagrama queda en blanco o avisa
  `Syntax error in text`, revisar la sintaxis de esa sección.

**Validación local de los diagramas** (tras editar cualquier sección):

```powershell
cd tools
npm install            # primera vez únicamente
node check-mermaid.js ..\arquitectura-visual.html
# esperado: 6/6 OK
```

El script (`tools/check-mermaid.js`) abre cada bloque `<pre class="mermaid">`
con Mermaid real (v11.16.1, la misma que tu navegador) y reporta OK/ERROR por
diagrama. Herramientas: `tools/package.json` (+ `mermaid`, `puppeteer-core`).
`node_modules/` no se sube al repo.

> **Nombres en la arquitectura:** en los documentos de arquitectura el owner se
> llama **Kurt** (`admin`). En la tienda publicada el crédito de la página es
> **romis** ("Owner · romis"), tal como aparece en `public/index.html`. Ambas
> referencias conviven: una es la autoría técnica, la otra el crédito visible
> de la tienda.

---

## 17. Glosario

- **JWT**: JSON Web Token de acceso emitido por Netlify Identity.
- **`nf_jwt`**: cookie HttpOnly de sesión que consume el edge.
- **Git Gateway**: puente Netlify→GitHub que usa el CMS para commits en
  nombre del editor.
- **Editorial workflow**: flujo Decap que crea ramas `cms/*` como borradores
  y publica con un merge a `main`.
- **Blobs**: almacenamiento clave-valor de Netlify usado como data store.
- **Forms (Netlify)**: servicio que captura envíos y dispara emails (usado
  aquí como canal de notificación).
- **`X-Use-Cookie`**: cabecera del refresco de token que renueva la cookie en
  el navegador.