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
