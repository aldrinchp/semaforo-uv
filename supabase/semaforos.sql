-- Semáforos UV (ESP32) y sus lecturas. Ejecutar una vez en Supabase: SQL Editor -> New query -> Run.
-- El ESP32 envía una lectura por minuto llamando a record_uv_reading con la clave secreta de su
-- semáforo. La app solo puede leer (semáforos y lecturas); nadie puede leer las claves.

-- 1. Semáforos: datos públicos de cada dispositivo (para mostrarlos en la app).
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  place text check (char_length(place) <= 100),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);

-- 2. Claves de los semáforos, en una tabla aparte que nadie puede leer desde fuera.
--    Se guarda solo su huella (hash SHA-256), nunca la clave en sí.
create table public.device_keys (
  device_id uuid primary key references public.devices (id) on delete cascade,
  key_hash text not null unique
);

-- 3. Lecturas: una por semáforo y por minuto (la clave primaria evita duplicados si el ESP32
--    reenvía una lectura que ya había llegado).
create table public.uv_readings (
  device_id uuid not null references public.devices (id) on delete cascade,
  measured_at timestamptz not null,
  uv_avg real not null check (uv_avg between 0 and 30),
  uv_max real not null check (uv_max between 0 and 30),
  mv integer not null check (mv between 0 and 3300),
  received_at timestamptz not null default now(),
  primary key (device_id, measured_at)
);

-- 4. Seguridad (RLS): cualquier usuario con sesión (también los invitados) puede VER los semáforos
--    y sus lecturas: son información pública para la comunidad. Nadie puede escribir directamente.
alter table public.devices enable row level security;
alter table public.device_keys enable row level security;
alter table public.uv_readings enable row level security;

create policy "Usuarios con sesión ven los semáforos" on public.devices
  for select to authenticated using (true);
create policy "Usuarios con sesión ven las lecturas" on public.uv_readings
  for select to authenticated using (true);
-- device_keys no tiene políticas: nadie puede leerla ni modificarla desde la app o la API.

revoke all on public.devices, public.device_keys, public.uv_readings from anon, authenticated;
grant select on public.devices, public.uv_readings to authenticated;

-- 5. La "puerta" por la que entra cada lectura del ESP32. Comprueba la clave del semáforo y guarda
--    la lectura. Se ejecuta con permisos de administrador (security definer), así que es lo único
--    que puede escribir en uv_readings.
create function public.record_uv_reading(
  p_device_key text,
  p_uv_avg real,
  p_uv_max real,
  p_mv integer,
  p_measured_at timestamptz default null  -- si el ESP32 aún no tiene hora, se usa la de llegada
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device uuid;
  -- Redondeada al minuto: así cada semáforo guarda como máximo una lectura por minuto.
  v_measured_at timestamptz := date_trunc('minute', coalesce(p_measured_at, now()));
begin
  select device_id into v_device
  from public.device_keys
  where key_hash = encode(sha256(convert_to(p_device_key, 'UTF8')), 'hex');

  if v_device is null then
    raise exception 'Clave de semáforo no válida';
  end if;
  if v_measured_at > now() + interval '5 minutes' or v_measured_at < now() - interval '30 days' then
    raise exception 'Hora de medición fuera de rango: %', v_measured_at;
  end if;

  insert into public.uv_readings (device_id, measured_at, uv_avg, uv_max, mv)
  values (v_device, v_measured_at, p_uv_avg, p_uv_max, p_mv)
  on conflict (device_id, measured_at) do nothing;
end;
$$;

-- El ESP32 usa la clave pública (rol anon): puede llamar a esta función y a nada más.
revoke all on function public.record_uv_reading from public;
grant execute on function public.record_uv_reading to anon, authenticated;

-- 6. Registrar un semáforo nuevo (solo desde el SQL Editor). Devuelve su clave secreta UNA sola vez.
--    Uso: select public.register_device('Nombre', 'Lugar', latitud, longitud);
create function public.register_device(
  p_name text,
  p_place text,
  p_latitude double precision,
  p_longitude double precision
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_key text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  insert into public.devices (name, place, latitude, longitude)
  values (p_name, p_place, p_latitude, p_longitude)
  returning id into v_id;

  insert into public.device_keys (device_id, key_hash)
  values (v_id, encode(sha256(convert_to(v_key, 'UTF8')), 'hex'));

  return v_key;
end;
$$;

-- Nadie puede registrar semáforos desde la app ni la API; solo el equipo, desde el panel.
revoke all on function public.register_device from public, anon, authenticated;

-- 7. (Añadido después) Valor EN VIVO: una sola fila por semáforo que se SOBRESCRIBE en cada envío
--    (la tabla no crece). El ESP32 la actualiza cuando cambia el UV o cada 30 s; la app la recibe al
--    instante con Supabase Realtime. El historial por minuto (uv_readings) sigue igual.
create table public.device_live (
  device_id uuid primary key references public.devices (id) on delete cascade,
  uv real not null check (uv between 0 and 30),
  updated_at timestamptz not null default now()  -- hora de llegada (no hace falta la hora del ESP32)
);

alter table public.device_live enable row level security;
create policy "Usuarios con sesión ven el valor en vivo" on public.device_live
  for select to authenticated using (true);
revoke all on public.device_live from anon, authenticated;
grant select on public.device_live to authenticated;

-- Igual que record_uv_reading: comprueba la clave del semáforo y guarda (reemplazando) su valor.
create function public.record_live_uv(p_device_key text, p_uv real)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device uuid;
begin
  select device_id into v_device
  from public.device_keys
  where key_hash = encode(sha256(convert_to(p_device_key, 'UTF8')), 'hex');

  if v_device is null then
    raise exception 'Clave de semáforo no válida';
  end if;

  insert into public.device_live (device_id, uv, updated_at)
  values (v_device, p_uv, now())
  on conflict (device_id) do update set uv = excluded.uv, updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.record_live_uv from public;
grant execute on function public.record_live_uv to anon, authenticated;

-- Realtime: que Supabase avise a la app cada vez que cambie esta tabla (respeta las reglas RLS).
alter publication supabase_realtime add table public.device_live;

-- 8. (Añadido después) Resumen por día de un semáforo, para el historial de la app: el UV máximo
--    medido y cuántas lecturas hubo cada día de los últimos p_days días (en la zona horaria p_tz).
--    Supabase hace las cuentas y la app recibe solo un resumen por día, no miles de lecturas.
--    Respeta las reglas RLS de uv_readings: solo usuarios con sesión.
create function public.device_daily_max(
  p_device uuid,
  p_days integer default 7,
  p_tz text default 'America/Lima'
)
returns table (day date, uv_max real, readings integer)
language sql
stable
set search_path = ''
as $$
  select (measured_at at time zone p_tz)::date as day, max(uv_max), count(*)::integer
  from public.uv_readings
  where device_id = p_device
    and measured_at >= ((now() at time zone p_tz)::date - (p_days - 1)) at time zone p_tz
  group by 1
  order by 1;
$$;

revoke all on function public.device_daily_max from public, anon;
grant execute on function public.device_daily_max to authenticated;
