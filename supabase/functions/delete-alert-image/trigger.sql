-- Borra la foto de una alerta cuando la alerta se elimina (a mano o por la caducidad de retention.sql).
-- El trigger llama a la Edge Function "delete-alert-image" con pg_net y un secreto compartido.
-- Pasos de puesta en marcha: supabase/README.md → "Borrado de fotos".
-- Requisitos en Vault: project_url y cleanup_secret.

create extension if not exists pg_net;

create or replace function public.delete_alert_image()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  base_url text;
  cleanup_secret text;
begin
  select decrypted_secret into base_url       from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into cleanup_secret from vault.decrypted_secrets where name = 'cleanup_secret';
  if base_url is null or cleanup_secret is null then
    raise warning 'delete_alert_image: faltan project_url o cleanup_secret en Vault';
    return old;
  end if;

  perform net.http_post(
    url     := base_url || '/functions/v1/delete-alert-image',
    body    := jsonb_build_object('image_path', old.image_path),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cleanup-secret', cleanup_secret)
  );
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
  for each row
  when (old.image_path is not null and old.image_path not like 'http%')  -- solo fotos del bucket
  execute function public.delete_alert_image();
