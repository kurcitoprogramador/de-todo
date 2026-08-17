# Flujo de trabajo: cargar productos, fotos, precios y stock

> Documento operativo (17 ago 2026) — Catálogo "De Todo"
> URL: https://de-todo-catalogo.netlify.app

---

## 1. Qué puede hacer cada quien

| Persona | Acceso | Qué puede hacer |
|---|---|---|
| Dueño (rol `admin`) | `/dashboard` y `/admin` | Ver estadísticas, ver usuarios y movimientos, editar productos, asignar roles |
| Editor (rol `editor`) | `/admin` | Agregar, editar y eliminar productos |
| Visitante registrado (sin rol) | `/` (tienda) | Ver el catálogo; su registro queda guardado |
| Visitante anónimo | `/` (tienda) | Ver el catálogo |

---

## 2. Cómo agrega un producto la persona encargada

1. Entra a `/acceso` e inicia sesión con su correo (o se registra si aún no
   tiene cuenta).
2. Le debe aparecer el enlace/permiso para `/admin` (el dueño le asigna el
   rol `editor`).
3. En `/admin` llena el formulario:
   - Foto del producto (arrastra la imagen; va a `public/products/`)
   - Nombre
   - Precio en soles (S/)
   - Disponibilidad: Disponible / Pocas unidades / Agotado
   - Etiqueta (Perfume, Bolso, Calzado, Nuevo...)
   - Descripción breve
4. Pulsa **Guardar**. En 1-2 minutos la tienda muestra el cambio (auto-build
   de Netlify).

---

## 3. Cómo se ve la disponibilidad en la tienda

Sobre la foto del producto:

- **Disponible** → badge verde menta
- **Pocas unidades** → badge durazno
- **Agotado** → badge gris y botón "Comprar" deshabilitado

El dato se guarda en `public/products.json` en el campo `availability`
(`disponible`, `pocas`, `agotado`).

---

## 4. Cómo ve el dueño quién se registró y sus movimientos

1. Entra a `/acceso` con la cuenta del dueño
   (`kurtnarra17@gmail.com`).
2. Entra a `/dashboard`.
3. Ve:
   - Cantidad de usuarios registrados y movimientos.
   - Actividad de los últimos 7 y 30 días.
   - Gráfico de movimientos por día.
   - Tabla de usuarios con correo, rol, ingresos y última actividad.
   - Lista de movimientos recientes (altas e ingresos).

Los movimientos se guardan automáticamente (funciones `identity-signup.js`
y `identity-login.js` en `netlify/functions/`), sin que nadie tenga que
configurar nada.

> Nota: si el dueño (o un editor) ve "Acceso restringido" justo después de que
> se le asigne un rol, es porque el JWT antiguo aún no lo trae. Hay que cerrar
> sesión y volver a entrar (el sitio renueva el token automáticamente). Los
> roles canónicos de Netlify Identity viven en `app_metadata.roles`.

---

## 5. Estructura de datos (public/products.json)

```json
{
  "whatsapp": "51961841885",
  "products": [
    {
      "name": "Nombre del producto",
      "price": 45,
      "description": "Descripción breve.",
      "tag": "Nuevo",
      "availability": "disponible",   // disponible | pocas | agotado
      "image": "products/mi-foto.jpg"
    }
  ]
}
```

---

## 6. Si el dueño quiere más movimientos o más control

El registro de movimientos está listo para ampliar:

- **Bloquear registros** de ciertos dominios: activar `userValidate`.
- **Registrar cambios de perfil / borrados**: activar `userModified` y
  `userDeleted` (convención nueva de Netlify).
- **Guardar IP y dispositivo**: agregar campos en las funciones de eventos.

Ver `ARCHITECTURE.md` para el diseño completo y `DEPLOY_NETLIFY.md` para el
setup.
