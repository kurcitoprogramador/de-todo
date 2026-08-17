# Correos de Netlify Identity — plantillas

Estas plantillas reemplazan los correos automáticos de Netlify Identity
(confirmación de registro, invitación y recuperación de contraseña).

## Cómo activarlas

1. Netlify → tu sitio → **Site configuration** → **Identity** → **Emails**.
2. Hay tres bloques. En cada uno pulsa *Edit/editar* y reemplaza el contenido:
   - **Confirmation**: pegar `emails/mensaje-registro.html`
   - **Invitation**: pegar `emails/mensaje-invitacion.html`
   - **Password recovery**: pegar `emails/mensaje-recuperacion.html`
3. Guarda.

> Importante: los marcadores `{{ confirmation_url }}`, `{{ invitation_url }}`
> y `{{ recovery_url }}` los completa Netlify automáticamente. No hay que
> cambiarlos.

## Cómo se ven

- Encabezado con el logo de la página.
- Botón de acción (confirmar / aceptar / cambiar contraseña).
- Aviso visual: "Este enlace usa una **verificación encriptada y segura**".
- Pie con el nombre de la página.

## Notas

- El logo se carga desde la URL del sitio publicado
  (`https://de-todo-catalogo.netlify.app/isologo/isologo-pastel-soft-144.png`).
- Si algún día el sitio cambia de subdominio, hay que actualizar esa URL en
  las tres plantillas (buscar `de-todo-catalogo.netlify.app` y reemplazar).
- Los correos llegan desde la dirección por defecto de Netlify
  (no-reply de Netlify). Se puede personalizar en *Branding/From email* si
  el plan lo permite.