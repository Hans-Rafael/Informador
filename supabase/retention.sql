-- Caducidad de alertas por categoría (ejecutar después de schema.sql).
--
-- Una noticia hiperlocal envejece rápido: un corte de calle de hace una semana es ruido.
-- Cada día a medianoche de Buenos Aires (03:00 UTC; pg_cron trabaja en UTC y Argentina es UTC-3 todo el año) se borran las alertas que superan la retención de su categoría.
-- Los votos y reportes se borran solos (on delete cascade) y la foto, con el trigger de delete-alert-image.
--
--   seguridad, transito  → 2 días
--   comercio             → 3 días
--   cultura              → 7 días
--   servicios y el resto → 3 días
--
-- Además, borra los tokens de notificación sin renovar en 30 días (ver más abajo).

create extension if not exists pg_cron;

-- cron.schedule con el mismo nombre actualiza el trabajo: se puede volver a ejecutar sin duplicarlo.
select cron.schedule(
  'limpieza-alerts-por-categoria',
  '0 3 * * *',
  $$
  delete from public.alerts
  where
    case
      when category in ('transito', 'seguridad') then created_at < now() - interval '2 days'
      when category = 'comercio'                 then created_at < now() - interval '3 days'
      when category = 'cultura'                  then created_at < now() - interval '7 days'
      else                                            created_at < now() - interval '3 days'
    end
  $$
);

-- ───────────── Tokens de notificación abandonados ─────────────
-- Cada fila de push_tokens es un teléfono registrado para recibir avisos. La app renueva updated_at
-- cada vez que lo registra, así que un token sin renovar en 30 días es de una app desinstalada o
-- abandonada. Se borra cada día a las 00:10 de Buenos Aires (03:10 UTC); quien vuelva a abrir la app se registra de nuevo.
-- Requiere haber ejecutado push.sql (si no, la tabla no existe).
select cron.schedule(
  'limpieza-push-tokens',
  '10 3 * * *',
  $$ delete from public.push_tokens where updated_at < now() - interval '30 days' $$
);

-- La foto de cada alerta borrada se elimina del bucket con el trigger de
-- supabase/functions/delete-alert-image/trigger.sql (llama a una Edge Function).

-- Para quitarlos:  select cron.unschedule('limpieza-alerts-por-categoria');
--                  select cron.unschedule('limpieza-push-tokens');
-- Para ver las ejecuciones:  select * from cron.job_run_details order by start_time desc limit 10;
