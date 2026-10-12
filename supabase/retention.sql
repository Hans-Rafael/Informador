-- Caducidad de alertas por categoría (ejecutar después de schema.sql).
--
-- Una noticia hiperlocal envejece rápido: un corte de calle de hace una semana es ruido.
-- Cada día a medianoche (UTC) se borran las alertas que superan la retención de su categoría.
-- Los votos y reportes se borran solos (on delete cascade) y la foto, con el trigger del final.
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

-- ───────────── Fotos huérfanas ─────────────
-- Borrar la fila de la alerta no borra su foto del bucket "alert-images". Supabase no permite
-- borrar archivos con SQL (solo quedaría el registro y el archivo seguiría ocupando espacio), así
-- que al borrarse una alerta pedimos a la API de Storage que borre su foto, con pg_net.
-- Hace falta guardar dos secretos en Vault (una sola vez, ver supabase/README.md):
--   project_url       → https://TU-PROYECTO.supabase.co
--   service_role_key  → la clave service_role (SECRETA: no la pegues en chats ni en git)
-- Sin ellos el trigger no hace nada y las alertas se borran igual.

create extension if not exists pg_net;

create or replace function public.delete_alert_image()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  base_url text;
  service_key text;
begin
  select decrypted_secret into base_url    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'service_role_key';
  if base_url is null or service_key is null then
    return old;
  end if;

  perform net.http_delete(
    url     := base_url || '/storage/v1/object/alert-images/' || old.image_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || service_key)
  );
  return old;
exception when others then
  -- Una foto que no se pudo borrar nunca debe impedir borrar la alerta.
  return old;
end;
$$;

revoke all on function public.delete_alert_image() from public, anon, authenticated;

drop trigger if exists alerts_delete_image on public.alerts;
create trigger alerts_delete_image
  after delete on public.alerts
  for each row
  when (old.image_path is not null)
  execute function public.delete_alert_image();

-- Para quitarlo:  select cron.unschedule('limpieza-alerts-por-categoria');
-- Para ver las ejecuciones:  select * from cron.job_run_details order by start_time desc limit 10;
