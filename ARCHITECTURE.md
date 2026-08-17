# Catálogo De Todo — Documentación

> Última actualización: 17 ago 2026
> Sitio: https://de-todo-catalogo.netlify.app

---

## 1. Qué es esto

Un catálogo de productos ("De Todo") publicado en Netlify con:

1. **Tienda pública** (`/`): tarjeta de productos con foto, precio, etiqueta y
   disponibilidad, botón de compra por WhatsApp.
2. **Panel de edición** (`/admin`): Decap CMS (formulario visual) para
   agregar/editar/eliminar productos. Solo usuarios con rol `editor` o
   `admin`.
3. **Registro abierto** (`/acceso`): cualquiera puede crearse una cuenta con
   su correo (email + contraseña con verificación). Los registrados que no
   tengan rol asignado solo pueden ver la tienda (rol "solo lectura").
4. **Panel de estadísticas** (`/dashboard`): exclusivo del dueño (rol
   `admin`). Muestra usuarios registrados, sus movimientos (altas/ingresos)
   y métricas de actividad.

---

## 2. Roles y accesos

| Rol | Qué puede hacer | Cómo se obtiene |
|---|---|---|
| `admin` (dueño) | Editar catálogo + ver estadísticas | Cuenta principal `admin@de-todo-catalogo.netlify.app` |
| `editor` | Editar catálogo (agregar/quitar/editar productos) | El dueño asigna el rol |
| sin rol | Ver la tienda únicamente | Registro libre en `/acceso` |

El registro está **abierto**: cualquier persona puede inscribirse en
`/acceso` con su correo. El dueño asigna roles desde el panel de Identity de
Netlify (Site settings → Identity → usuarios).

---

## 3. Estructura del repo

```
romis/
├── public/                       # sitio estático (se publica tal cual)
│   ├── index.html                # tienda (lee products.json, render en JS)
│   ├── products.json             # datos del catálogo
│   ├── products/                 # fotos (media_folder del CMS)
│   ├── isologo/                  # logo + variantes web
│   ├── favicon.ico
│   ├── admin/                    # panel Decap CMS
│   │   ├── index.html
│   │   └── config.yml
│   ├── acceso/                   # login / registro público
│   │   └── index.html
│   ├── dashboard/                # panel de estadísticas (dueño)
│   │   └── index.html
│   └── dashboard-negado.html     # aviso de acceso restringido
├── netlify/
│   └── functions/                # funciones serverless
│       ├── identity-signup.js    # registra altas de usuarios
│       ├── identity-login.js     # registra ingresos
│       └── stats.js              # API de estadísticas (rol admin)
├── emails/                       # plantillas de correo (registro, invitación, recuperación)
│   ├── mensaje-registro.html
│   ├── mensaje-invitacion.html
│   ├── mensaje-recuperacion.html
│   └── README_EMAILS.md
├── netlify.toml                  # build, redirects y roles
├── package.json                  # dependencias de las funciones
├── DEPLOY_NETLIFY.md             # guía de publicación y setup de Identity
├── FLUJO_PRODUCTOS.md            # guía operativa (cargar productos)
└── ARCHITECTURE.md               # este documento
```

---

## 4. Flujo de datos y publicación

```
[Editora] --guarda producto--> [Decap CMS /admin] --commit--> [GitHub repo]
        --> [Netlify auto-build] --> [Tienda /] actualizada (1-2 min)

[Usuario] --registro/login--> [Netlify Identity] --evento--> [identity-signup.js
                                                               identity-login.js]
        --> [Netlify Blobs "movimientos"]

[Dueno] --entra /dashboard--> [stats.js] --lee blobs + valida rol admin-->
        [tabla de usuarios y movimientos]
```

- Los movimientos se guardan en **Netlify Blobs** (store `movimientos`), sin
  base de datos externa.
- Cada evento (`signup`, `login`) se registra con: tipo, correo, rol,
  fecha/hora (y en el futuro IP/dispositivo).
- La función `stats.js` es la única que puede leer los datos, y exige que el
  usuario tenga rol `admin` (valida el token JWT del widget de Identity).

---

## 5. Tipos de movimiento registrados

| Tipo | Se registra cuando | Función |
|---|---|---|
| `signup` | Un usuario confirma su alta (registro) | `identity-signup.js` |
| `login` | Un usuario inicia sesión | `identity-login.js` |

Nota: Netlify también ofrece `userValidate`, `userModified` y `userDeleted`
(convención de nombres nueva). Para este proyecto se usó la convención
**legacy por nombre de archivo** (`identity-signup.js`, `identity-login.js`),
que sigue soportada. Si se quiere ampliar (validar dominios de correo, bloquear
usuarios, borrado), consultar "Identity event functions" en la doc de Netlify.

---

## 6. Estadísticas disponibles en /dashboard

- Total de usuarios registrados y total de movimientos.
- Actividad últimos 7 y 30 días.
- Gráfico de movimientos por día (últimos 14 días).
- Tabla de usuarios: correo, rol, cantidad de ingresos, última actividad.
- Lista de movimientos recientes (tipo, correo, fecha).

---

## 7. Seguridad

- `/admin` está protegido por redirects con condición de rol
  (`editor`, `admin`) en `netlify.toml`.
- `/dashboard` exige rol `admin` (redirect + verificación en `stats.js`).
- `stats.js` valida el token JWT del usuario y rechaza con 403 si no es
  `admin`. Nunca expone el token de Netlify ni datos sensibles.
- La página del dashboard no publica ningún dato en el HTML; todo se carga
  vía API con autenticación.

---

## 8. Próximos pasos (infraestructura, los hace el dueño)

1. Crear el repo en GitHub y subir el proyecto.
2. Conectar Netlify al repo (Build & Deploy → import from GitHub) con
   `publish = public` y funciones en `netlify/functions`.
3. Activar Identity: Site settings → Identity → Enable.
4. Dejar registración en **Open** (permite registro libre).
5. Activar **Git Gateway**: Identity → Services → Enable Git Gateway.
6. Crear la cuenta del dueño con rol `admin` (Identity → Add user) con el
   correo `admin@de-todo-catalogo.netlify.app`.
7. Probar el flujo completo: registrar un usuario, verlo en /dashboard.

Los pasos detallados están en `DEPLOY_NETLIFY.md`.

---

## 9. Advertencia sobre deprecación

Netlify anunció (marzo 2025) que **Identity + Git Gateway** está en proceso
de deprecación; el reemplazo oficial anunciado es la extensión Auth0. De
momento todo esto sigue funcionando. Si en el futuro se elimina, el panel
Decap y el dashboard son los mismos; solo cambia el método de autenticación.
