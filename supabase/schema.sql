-- InfoBarrio · esquema inicial para Supabase (Postgres).
-- Se ejecuta UNA vez en: Supabase → SQL Editor → New query → pegar todo → Run.
-- Es seguro volver a ejecutarlo: usa "if not exists" / "or replace" donde se puede.
--
-- Identidad: la app usa inicio de sesión anónimo de Supabase (un usuario por dispositivo, sin
-- registro). Esas sesiones tienen el rol "authenticated", y todas las reglas (RLS) se apoyan en auth.uid().

-- ───────────── Tablas ─────────────

create table if not exists public.alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category     text not null check (category in ('seguridad', 'transito', 'cultura', 'comercio', 'servicios')),
  -- Mismos límites que el editor de la app (compartir.tsx).
  title        text not null check (char_length(title) between 5 and 60),
  description  text not null check (char_length(description) between 10 and 400),
  image_path   text,  -- ruta dentro del bucket "alert-images"
  latitude     double precision not null check (latitude between -90 and 90),
  longitude    double precision not null check (longitude between -180 and 180),
  author_name  text not null default 'Vecino' check (char_length(author_name) <= 40),
  created_at   timestamptz not null default now()
);

create index if not exists alerts_geo_idx on public.alerts (latitude, longitude);
create index if not exists alerts_created_idx on public.alerts (created_at desc);

-- Un voto por usuario y alerta: la clave primaria compuesta lo garantiza.
create table if not exists public.validations (
  alert_id   uuid not null references public.alerts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);

create table if not exists public.reports (
  alert_id   uuid not null references public.alerts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason     text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);

-- ───────────── Vista que usa la app para listar ─────────────
-- Trae los contadores de validaciones y reportes, y oculta las alertas con 3 o más reportes
-- (mismo umbral que HIDDEN_REPORTS_THRESHOLD en la app). Se ejecuta con los permisos de su
-- dueño a propósito: así los contadores son exactos sin exponer quién votó ni quién reportó.
create or replace view public.alerts_feed as
select
  a.*,
  (select count(*) from public.validations v where v.alert_id = a.id)::int as validations,
  (select count(*) from public.reports r where r.alert_id = a.id)::int     as reports
from public.alerts a
where (select count(*) from public.reports r where r.alert_id = a.id) < 3;

-- ───────────── Seguridad por filas (RLS) ─────────────

alter table public.alerts      enable row level security;
alter table public.validations enable row level security;
alter table public.reports     enable row level security;

-- Alertas: cualquiera con sesión las lee; solo publicas como vos mismo; solo borras las tuyas.
drop policy if exists "alerts_select" on public.alerts;
create policy "alerts_select" on public.alerts for select to authenticated using (true);

drop policy if exists "alerts_insert_own" on public.alerts;
create policy "alerts_insert_own" on public.alerts for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "alerts_delete_own" on public.alerts;
create policy "alerts_delete_own" on public.alerts for delete to authenticated
  using (user_id = auth.uid());

-- Validaciones: ves solo las tuyas (para saber qué ya validaste) y no puedes validar tu propia alerta.
drop policy if exists "validations_select_own" on public.validations;
create policy "validations_select_own" on public.validations for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "validations_insert_others" on public.validations;
create policy "validations_insert_others" on public.validations for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = auth.uid())
  );

-- Reportes: igual que las validaciones.
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "reports_insert_others" on public.reports;
create policy "reports_insert_others" on public.reports for insert to authenticated
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = auth.uid())
  );

-- La vista solo se lee; nadie escribe a través de ella.
revoke all on public.alerts_feed from anon, authenticated;
grant select on public.alerts_feed to authenticated;

-- ───────────── Imágenes (Storage) ─────────────
-- Bucket público de lectura; cada usuario sube solo dentro de su propia carpeta (<user_id>/...).

insert into storage.buckets (id, name, public)
values ('alert-images', 'alert-images', true)
on conflict (id) do nothing;

drop policy if exists "alert_images_read" on storage.objects;
create policy "alert_images_read" on storage.objects for select
  using (bucket_id = 'alert-images');

drop policy if exists "alert_images_upload_own_folder" on storage.objects;
create policy "alert_images_upload_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'alert-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────── Tiempo real ─────────────
-- Para que la app reciba alertas nuevas sin recargar.
do $$
begin
  alter publication supabase_realtime add table public.alerts;
exception when duplicate_object then null;
end $$;
