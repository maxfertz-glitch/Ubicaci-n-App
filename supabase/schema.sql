-- Esquema de la app. Pegar en Supabase > SQL Editor y ejecutar.

-- Quién puede ver a quién (siempre lo crea la persona que comparte)
create table public.shares (
  owner_id  uuid not null references auth.users on delete cascade,  -- quien comparte
  viewer_id uuid not null references auth.users on delete cascade,  -- quien mira
  created_at timestamptz default now(),
  primary key (owner_id, viewer_id)
);

-- Códigos de invitación de un solo uso, válidos 24 h
create table public.invites (
  code text primary key default upper(substr(md5(random()::text), 1, 6)),
  owner_id uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null default now() + interval '24 hours'
);

create table public.locations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m real,
  speed real,
  battery real,
  recorded_at timestamptz not null default now()
);
create index on public.locations (user_id, recorded_at desc);

alter table public.shares    enable row level security;
alter table public.invites   enable row level security;
alter table public.locations enable row level security;

-- Solo subís tu propia ubicación
create policy "insert own" on public.locations for insert with check (auth.uid() = user_id);
-- Ves la tuya y la de quien te invitó
create policy "read own or shared" on public.locations for select using (
  auth.uid() = user_id
  or exists (select 1 from public.shares s where s.owner_id = user_id and s.viewer_id = auth.uid())
);
-- Podés borrar tu historial cuando quieras
create policy "delete own" on public.locations for delete using (auth.uid() = user_id);

create policy "see my shares" on public.shares for select using (auth.uid() in (owner_id, viewer_id));
-- Quien comparte puede revocar el acceso en cualquier momento
create policy "owner revokes" on public.shares for delete using (auth.uid() = owner_id);

create policy "owner manages invites" on public.invites for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Canjear un código: crea el permiso y borra el código
create or replace function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  delete from invites where code = upper(p_code) and expires_at > now() returning owner_id into v_owner;
  if v_owner is null then raise exception 'Código inválido o vencido'; end if;
  if v_owner = auth.uid() then raise exception 'No podés aceptar tu propio código'; end if;
  insert into shares (owner_id, viewer_id) values (v_owner, auth.uid()) on conflict do nothing;
  return v_owner;
end $$;

-- Activar tiempo real para la tabla de ubicaciones
alter publication supabase_realtime add table public.locations;

-- =====================================================================
-- Funciones para cuando el celular se queda sin datos o sin batería
-- =====================================================================

alter table public.locations add column if not exists low_battery boolean default false;

-- Si la persona está compartiendo (para no alertar cuando lo pausó a propósito)
create table if not exists public.sharing_status (
  user_id uuid primary key references auth.users on delete cascade,
  active boolean not null default false,
  updated_at timestamptz not null default now(),
  last_alert_for timestamptz   -- última posición por la que ya se avisó (evita repetir)
);
alter table public.sharing_status enable row level security;
create policy "own status" on public.sharing_status for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "viewers read status" on public.sharing_status for select using (
  exists (select 1 from public.shares s where s.owner_id = user_id and s.viewer_id = auth.uid())
);

-- Tokens de notificaciones push de cada teléfono
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "own tokens" on public.push_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Revisa cada 5 minutos quién dejó de reportar y avisa por push a quienes lo pueden ver.
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.check_silent(p_minutes int default 15) returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_sent int := 0; v_msgs jsonb;
begin
  for r in
    select st.user_id, l.lat, l.lng, l.recorded_at, l.battery, l.low_battery,
           coalesce(u.raw_user_meta_data->>'name', u.email) as name
    from sharing_status st
    join auth.users u on u.id = st.user_id
    join lateral (select * from locations where user_id = st.user_id order by recorded_at desc limit 1) l on true
    where st.active
      and l.recorded_at < now() - make_interval(mins => p_minutes)
      and (st.last_alert_for is null or st.last_alert_for < l.recorded_at)
  loop
    select jsonb_agg(jsonb_build_object(
      'to', pt.token, 'sound', 'default', 'priority', 'high',
      'title', r.name || ' dejó de enviar su ubicación',
      'body', 'Última posición hace ' || extract(epoch from now() - r.recorded_at)::int / 60 || ' min'
              || case when r.low_battery then ' (tenía batería baja: ' || round(r.battery * 100) || '%)' else '' end
              || '. Tocá para verla en el mapa.',
      'data', jsonb_build_object('user_id', r.user_id, 'lat', r.lat, 'lng', r.lng)))
    into v_msgs
    from shares s join push_tokens pt on pt.user_id = s.viewer_id
    where s.owner_id = r.user_id;

    if v_msgs is not null then
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := v_msgs);
      v_sent := v_sent + jsonb_array_length(v_msgs);
    end if;
    update sharing_status set last_alert_for = r.recorded_at where user_id = r.user_id;
  end loop;
  return v_sent;
end $$;
revoke execute on function public.check_silent(int) from public, anon, authenticated;

select cron.schedule('avisar-sin-senal', '*/5 * * * *', $$select public.check_silent(15)$$);
