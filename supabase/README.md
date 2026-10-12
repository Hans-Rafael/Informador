# Supabase · puesta en marcha

1. Crea una cuenta en <https://supabase.com> (el plan Free no pide tarjeta) y un proyecto nuevo.
   Región recomendada para Argentina: **South America (São Paulo)**.
2. **Authentication → Sign In / Providers → Anonymous Sign-Ins → activar.** Sin esto la app no
   puede identificar a cada dispositivo.
3. **SQL Editor → New query**, pega el contenido de `schema.sql` y pulsa **Run**.
4. **Project Settings → API**: copia la *Project URL* y la clave *anon* / *publishable*
   (la pública, nunca la `service_role`).
5. En la raíz del proyecto crea un archivo `.env` (no se sube a git):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
   ```

La clave *anon* puede ir dentro de la app: la protección real son las reglas RLS de `schema.sql`.

## Moderación

`schema.sql` ya incluye las reglas: ofensivo se oculta con 2 reportes; falso y spam, con 3 o más y más reportes que validaciones; ubicación incorrecta no oculta. Cada usuario puede hacer hasta 20 reportes cada 24 h.

Para revisar a mano, en el **SQL Editor**: `select * from alerts_reported;` lista las alertas con algún reporte (ocultas o no), las más reportadas primero. Para borrar una falsa: `delete from alerts where id = '…';`.

Publicar también está limitado en el servidor: la foto debe ser un archivo propio del bucket (no una URL externa) y cada usuario puede crear hasta 10 alertas por hora. Se ajusta en la política `alerts_insert_own` de `schema.sql`. Para ver quién publica más: `select user_id, count(*) from alerts group by 1 order by 2 desc;`. Para limpiar a un abusador, `delete from auth.users where id = '…';` borra también sus alertas, votos y reportes.

Si ya tenías el esquema, vuelve a ejecutar `schema.sql` (es re-ejecutable): añade la columna `kind` a `reports` y actualiza la vista. Los reportes antiguos cuentan como "falsa".

## Caducidad de alertas (opcional)

Ejecuta `supabase/retention.sql` en el SQL Editor. Programa con `pg_cron` un borrado diario a medianoche UTC según la categoría:

| Categoría | Se borra tras |
| --- | --- |
| Seguridad, tránsito | 2 días |
| Promos y comercio | 3 días |
| Cultura y eventos | 7 días |
| Servicios y otras | 3 días |

Los votos y reportes se borran con la alerta. La **foto** del bucket `alert-images` se borra con una Edge Function: ver "Borrado de fotos" más abajo.

---

# Notificaciones push por radio

Cuando alguien publica una alerta, los teléfonos que la tienen dentro de su radio (menos el autor) reciben un aviso. Al tocarlo se abre la alerta.

## 1. Base de datos (Supabase)

En **SQL Editor** ejecuta `supabase/push.sql` (después de `schema.sql`). Crea la tabla `push_tokens` y el trigger que envía los avisos con `pg_net`. No hay funciones que desplegar ni claves secretas en Supabase.

## 2. Firebase (necesario en Android, gratis)

Las notificaciones de Android viajan por FCM de Google, y Expo necesita las credenciales de tu proyecto de Firebase.

1. Entra a <https://console.firebase.google.com> → **Agregar proyecto** (puedes desactivar Analytics).
2. **Configuración del proyecto → Tus apps → Android**: el nombre del paquete es `com.hansgarcia.infobarrio`. Descarga el **`google-services.json`** y ponlo en la **raíz del proyecto**. Está en `.gitignore`: no se sube a git.
3. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**: descarga un JSON.
   **Esta clave es un SECRETO: no la subas a git, no la pegues en chats y no la pongas en la app.**
4. Súbela a EAS, que es quien la entrega a Expo para enviar los avisos:

   ```bash
   pnpm exec eas credentials -p android
   # → Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1)
   # → Set up a Google Service Account Key → elige el JSON del paso 3
   ```

## 3. Recompilar la app

`expo-notifications` es una librería nativa: hay que **volver a compilar una vez**.

```bash
adb uninstall com.hansgarcia.infobarrio   # opcional, para empezar limpio
pnpm android
```

Para los builds de EAS, entrega también el `google-services.json` (el archivo local no llega a la nube):

```bash
pnpm exec eas env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility sensitive
```

Si algún indicador de `eas env:create` cambió, mira `pnpm exec eas env:create --help`.

## 4. Probar

Hace falta un **teléfono real** (los emuladores no reciben push).

- **Activar:** en la bienvenida (primer uso) o con el interruptor *Avisarme de alertas cercanas* de Alertas → Filtros.
- **Comprobar el teléfono:** en Supabase → **Table Editor → push_tokens** debe aparecer tu fila con `enabled = true`. Copia el `token` (empieza por `ExponentPushToken[`) y envíate una prueba desde <https://expo.dev/notifications>. Eso verifica Firebase y el teléfono sin tocar la base de datos.
- **Comprobar el trigger:** el autor no recibe sus propios avisos, así que necesitas un **segundo usuario** (otro teléfono, o borrar los datos del primero con `adb shell pm clear com.hansgarcia.infobarrio`). Publica desde uno estando dentro del radio del otro.

## Privacidad y límites

- Se guarda una **zona aproximada (~100 m)**, nunca la posición exacta, y se puede desactivar en cualquier momento.
- Los tokens de apps desinstaladas o sin abrir en **30 días** se borran solos cada día con `pg_cron` (ver `retention.sql`, trabajo `limpieza-push-tokens`). Quien vuelva a abrir la app se registra de nuevo.
- Por ahora se avisa de todas las categorías; elegir cuáles queda para más adelante.

---

# Borrado de fotos (Edge Function)

Supabase no deja borrar archivos con SQL, y `pg_net` no puede hablar con Storage con una clave `sb_secret_…`. Por eso, al borrarse una alerta, un trigger llama a una Edge Function que borra la foto con `supabase-js`. La clave de administrador no sale de Supabase: la función la recibe inyectada.

1. **Secreto compartido.** Genera un valor aleatorio largo (`openssl rand -hex 32`, o cualquier generador de contraseñas de 40+ caracteres). Se usa dos veces, con el mismo valor.
2. **Edge Functions → Deploy a new function → Via Editor.** Nombre `delete-alert-image`; pega `supabase/functions/delete-alert-image/index.ts` y despliega. En los ajustes de la función desactiva **Verify JWT** (la protege el secreto compartido).
3. **Edge Functions → Secrets → Add new secret:** `CLEANUP_SECRET` con el valor del paso 1.
4. **Vault** (SQL Editor): `select vault.create_secret('EL-VALOR', 'cleanup_secret');` (valor primero, nombre después). `project_url` ya debe existir.
5. **SQL Editor:** pega `supabase/functions/delete-alert-image/trigger.sql`. Reemplaza el trigger anterior, que tiene el mismo nombre.
6. **Prueba:** publica una alerta con foto, bórrala y comprueba en Storage que la foto desaparece. Si no, mira **Edge Functions → Logs** y los avisos `delete_alert_image:` en los logs de Postgres.

Si antes guardaste la clave `service_role` o `sb_secret_…` en Vault para esto (`service_role_key`), ya no hace falta: bórrala.
