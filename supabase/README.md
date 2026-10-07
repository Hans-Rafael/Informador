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
- Los tokens caducados (apps desinstaladas) no se limpian solos todavía.
- Por ahora se avisa de todas las categorías; elegir cuáles queda para más adelante.
