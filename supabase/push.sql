-- InfoBarrio · notificaciones push por radio.
-- Se ejecuta UNA vez en Supabase → SQL Editor, después de schema.sql. Es seguro repetirlo.
--
-- Cómo funciona: cada teléfono guarda aquí su token de Expo, su zona aproximada y su radio.
-- Cuando alguien publica una alerta, un trigger busca los teléfonos que la tienen dentro de su
-- radio (menos al autor) y envía los avisos al servicio de notificaciones de Expo con pg_net.
-- No hace falta desplegar funciones ni guardar claves secretas.

create extension if not exists pg_net;  -- si ya está activada desde el panel, no hace nada

-- ───────────── Tokens de notificación ─────────────
-- Un dispositivo por usuario anónimo: la clave primaria es el usuario.
create table if not exists public.push_tokens (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token      text not null,
  -- Zona aproximada: la app redondea a ~100 m antes de enviarla, nunca la posición exacta.
  latitude   double precision not null check (latitude between -90 and 90),
  longitude  double precision not null check (longitude between -180 and 180),
  radius_m   integer not null default 1000 check (radius_m between 100 and 50000),
  enabled    boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens for delete to authenticated
  using (user_id = auth.uid());

-- ───────────── Aviso al publicarse una alerta ─────────────

create or replace function public.notify_nearby_alert()
returns trigger
language plpgsql
security definer  -- lee push_tokens de todos, que las reglas RLS no dejan ver
set search_path = public, extensions
as $$
declare
  chunk record;
  label text := case new.category
    when 'seguridad' then 'Seguridad'
    when 'transito'  then 'Tránsito y calles'
    when 'servicios' then 'Servicios públicos'
    when 'cultura'   then 'Cultura y eventos'
    when 'comercio'  then 'Promos y comercio'
    else 'Nueva alerta'
  end;
begin
  -- Expo acepta hasta 100 mensajes por petición: agrupamos de a 100.
  for chunk in
    select jsonb_agg(m.msg) as body
    from (
      select
        jsonb_build_object(
          'to', d.token,
          'title', label || ' cerca de vos',
          'body', new.title || ' · a ' || (round(d.dist / 10) * 10)::int || ' m',
          'sound', 'default',
          'priority', 'high',
          'channelId', 'alertas',
          'data', jsonb_build_object('alertId', new.id)
        ) as msg,
        (row_number() over (order by d.dist) - 1) / 100 as grp
      from (
        select
          t.token,
          -- Distancia en metros (fórmula de haversine).
          2 * 6371000 * asin(sqrt(
            power(sin(radians(t.latitude - new.latitude) / 2), 2) +
            cos(radians(new.latitude)) * cos(radians(t.latitude)) *
            power(sin(radians(t.longitude - new.longitude) / 2), 2)
          )) as dist,
          t.radius_m
        from public.push_tokens t
        where t.enabled and t.user_id <> new.user_id
      ) d
      where d.dist <= d.radius_m
    ) m
    group by m.grp
  loop
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      body    := chunk.body,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end loop;

  return new;
exception when others then
  -- Un fallo de avisos nunca debe impedir que la alerta se publique.
  raise warning 'notify_nearby_alert: %', sqlerrm;
  return new;
end;
$$;

-- Solo el trigger la ejecuta: nadie puede llamarla desde la API.
revoke all on function public.notify_nearby_alert() from public, anon, authenticated;

drop trigger if exists alerts_notify_nearby on public.alerts;
create trigger alerts_notify_nearby
  after insert on public.alerts
  for each row execute function public.notify_nearby_alert();
