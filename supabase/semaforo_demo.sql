-- Semáforo de demostración con datos SIMULADOS, para probar la app sin esperar al sol.
-- Los datos van en un semáforo aparte: nunca se mezclan con los del semáforo real.
--
-- 1. Ejecutar este archivo (SQL Editor -> New query -> Run). Se puede volver a ejecutar sin problema.
-- 2. Generar o regenerar los datos de los últimos 7 días (hora de Lima). Los días anteriores van
--    completos (06:00 a 18:30), cada uno un poco distinto; hace 3 días queda SIN datos, como si el
--    semáforo hubiera estado apagado. Hoy:
--      select public.seed_demo_readings();    -- de día: desde las 06:00 hasta ahora
--      select public.seed_demo_readings(14);  -- para probar a cualquier hora: de 06:00 a 14:00 de hoy
--                                             -- (de noche, esas horas quedan "en el futuro")
-- 3. Borrarlo todo (el semáforo demo y sus lecturas):
--      delete from public.devices where name = 'Semáforo demo (datos simulados)';

-- La versión anterior solo tenía un parámetro: se borra para que no haya dos versiones.
drop function if exists public.seed_demo_readings(numeric);

create function public.seed_demo_readings(p_simulated_hour numeric default null, p_days integer default 7)
returns integer  -- cuántas lecturas generó
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name constant text := 'Semáforo demo (datos simulados)';
  v_device uuid;
  -- Las 06:00 de hoy en Lima, y hasta dónde llegar: ahora, o la hora que se pida simular.
  v_sunrise timestamptz := ((now() at time zone 'America/Lima')::date + time '06:00') at time zone 'America/Lima';
  v_end timestamptz := case
    when p_simulated_hour is null then date_trunc('minute', now())
    else v_sunrise + make_interval(mins => ((p_simulated_hour - 6) * 60)::integer)
  end;
  v_count integer := 0;
  v_added integer;
  v_day_sunrise timestamptz;
  v_peak numeric;
  v_cloud numeric;  -- horas desde las 06:00 en que pasa la nube
begin
  -- El semáforo demo se crea la primera vez, ~1 km al norte del semáforo real (o en Lima si no hay ninguno).
  select id into v_device from public.devices where name = v_name;
  if v_device is null then
    insert into public.devices (name, place, latitude, longitude)
    select v_name, 'Demostración', coalesce(min(latitude), -12.0464) + 0.01, coalesce(min(longitude), -77.0428)
    from public.devices
    returning id into v_device;
  end if;

  delete from public.uv_readings where device_id = v_device;

  -- Una lectura por minuto. El UV sigue al sol (sube desde las 06:00, pico a las 12:15, baja hasta
  -- las 18:30), con un poco de ruido y una nube de 36 min. Hoy: pico de ~9,5 y nube a las 10:00
  -- (hasta v_end); los días anteriores: completos, con pico entre 8 y 10 y la nube a otra hora.
  for d in 0 .. p_days - 1 loop
    continue when d = 3;  -- un día sin datos, como si el semáforo hubiera estado apagado
    v_day_sunrise := v_sunrise - make_interval(days => d);
    v_peak := case when d = 0 then 9.5 else 8 + random() * 2 end;
    v_cloud := case when d = 0 then 4 else 1 + random() * 9 end;

    insert into public.uv_readings (device_id, measured_at, uv_avg, uv_max, mv)
    select v_device, t, uv, least(uv + random() * 0.3, 30), (uv * 100 + 50)::integer
    from (
      select t,
        greatest(0, round((
          v_peak * power(greatest(0, sin(pi() * (extract(epoch from t - v_day_sunrise) / 3600) / 12.5)), 1.4)
            * case when extract(epoch from t - v_day_sunrise) / 3600 between v_cloud and v_cloud + 0.6 then 0.55 else 1 end
          + (random() - 0.5) * 0.3
        )::numeric, 2))::real as uv
      from generate_series(
        v_day_sunrise,
        case when d = 0 then v_end else v_day_sunrise + interval '12 hours 30 minutes' end,
        interval '1 minute'
      ) as t
    ) simulado;

    get diagnostics v_added = row_count;
    v_count := v_count + v_added;
  end loop;

  -- Valor "en vivo" del demo: el último simulado. Como nadie lo actualiza después, la app lo muestra
  -- "en vivo" solo durante el primer minuto y medio tras generar los datos.
  insert into public.device_live (device_id, uv, updated_at)
  select v_device, uv_avg, now() from public.uv_readings
  where device_id = v_device order by measured_at desc limit 1
  on conflict (device_id) do update set uv = excluded.uv, updated_at = excluded.updated_at;

  return v_count;
end;
$$;

-- Solo se puede usar desde el SQL Editor (ni la app ni la API pueden generar datos falsos).
revoke all on function public.seed_demo_readings from public, anon, authenticated;
