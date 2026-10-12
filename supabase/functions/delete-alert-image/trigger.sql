-- Plan B: el trigger llama a la Edge Function "delete-alert-image".
-- Requisitos previos:
--   supabase functions deploy delete-alert-image --no-verify-jwt
--   supabase secrets set CLEANUP_SECRET=<un-valor-largo-aleatorio>
--   select vault.create_secret('<mismo-valor>', 'cleanup_secret');
--   (project_url ya existe en Vault)

create or replace function public.delete_alert_image()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if old.image_path is not null then
    perform net.http_post(
      url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
                 || '/functions/v1/delete-alert-image',
      body    := jsonb_build_object('image_path', old.image_path),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_secret')
      )
    );
  end if;
  return old;
exception when others then
  -- Un fallo de limpieza nunca debe impedir borrar la alerta.
  raise warning 'delete_alert_image: %', sqlerrm;
  return old;
end;
$$;

revoke all on function public.delete_alert_image() from public, anon, authenticated;

drop trigger if exists alerts_delete_image on public.alerts;
create trigger alerts_delete_image
  after delete on public.alerts
  for each row execute function public.delete_alert_image();
