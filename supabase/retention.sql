-- Caducidad de alertas por categoría (ejecutar después de schema.sql).
--
-- Una noticia hiperlocal envejece rápido: un corte de calle de hace una semana es ruido.
-- Cada día a medianoche (UTC) se borran las alertas que superan la retención de su categoría.
-- Los votos y reportes se borran solos (on delete cascade) y la foto, con el trigger de delete-alert-image.
--
--   seguridad, transito  → 2 días
--   comercio             → 3 días
--   cultura              → 7 días
--   servicios y el resto → 3 días

create extension if not exists pg_cron;

-- cron.schedule con el mismo nombre actualiza el trabajo: se puede volver a ejecutar sin duplicarlo.
select cron.schedule(
  'limpieza-alerts-por-categoria',
  '0 0 * * *',
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

-- La foto de cada alerta borrada se elimina del bucket con el trigger de
-- supabase/functions/delete-alert-image/trigger.sql (llama a una Edge Function).

-- Para quitarlo:  select cron.unschedule('limpieza-alerts-por-categoria');
-- Para ver las ejecuciones:  select * from cron.job_run_details order by start_time desc limit 10;
