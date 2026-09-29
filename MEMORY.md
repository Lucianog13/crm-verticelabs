# CRM Vértice Labs — MEMORY

Mini-CRM para papá (Marcelo, 61) y hermano (Martín) de Lucho, vendedores de Vértice Labs.
Leads + envío de mails. Login con contraseña compartida.

## Arquitectura
- Frontend estático (vanilla JS, sin build) → GitHub Pages.
- Backend Supabase, proyecto "CRM", ref `yxjohzhsahnydigjqplr` (región us-east-1).
- Mails vía Brevo, enviados por la función Postgres `enviar_mail_lead` (extensión `http`, SÍNCRONO, detecta errores).
- Login: Supabase Auth, un solo usuario compartido `crm@verticelabs.com.ar` (contraseña `vertice2026`).

## Datos (tablas)
- `leads_crm`: id, nombre, telefono, email, empresa, estado (nuevo|en_proceso|cerrado|descarte), creado_por, actualizado_por, creado_en, actualizado_en.
- `usuarios_crm`: nombre, firma_mail (Marcelo/Martín/Luciano), activo.
- `config_crm`: clave/valor (`brevo_api_key`, `sender_email`). SIN acceso público (solo la función security definer).

## Seguridad
- RLS: solo `authenticated` lee/inserta/actualiza `leads_crm`; `anon` bloqueado (verificado: 401).
- No hay DELETE para el cliente (el estado "descarte" reemplaza el borrado).
- Claves sensibles en `.env` (gitignored). La publishable key va pública en `js/config.js` (es la de cliente).

## Archivos clave
- `js/config.js` → URL + publishable key (público).
- `js/api.js` → capa Supabase (auth + REST + RPC).
- `js/ui.js` → render de vistas (solo DOM).
- `js/app.js` → estado, sesión, eventos.
- `index.html` → vistas (login / quien-sos / dashboard) + modales.

## Pendiente / bloqueos
- **Brevo lista blanca de IPs:** el envío de mails desde Supabase falla con 401
  ("unrecognised IP address") porque Brevo tiene activada la autorización por IP y el
  IP de Supabase (AWS us-east-1) no está autorizado. FIX: en Brevo → Seguridad →
  IPs autorizadas → desactivar la restricción o agregar el IP de Supabase.
  Hasta que Lucho lo arregle, el resto del CRM funciona (leads, estados, login).
