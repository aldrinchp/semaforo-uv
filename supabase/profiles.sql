-- Perfil de cada usuario de SunShield. Ejecutar una vez en Supabase: SQL Editor -> New query -> Run.

-- 1. La tabla: una fila por usuario, enlazada a su cuenta de Auth.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 50),
  last_name text not null check (char_length(last_name) between 1 and 50),
  age_range text not null check (age_range in ('14-17', '18-29', '30-49', '50-64', '65+')),
  occupation text not null check (occupation in ('student', 'teacher', 'farm', 'market', 'outdoor', 'indoor', 'other')),
  sun_time text not null check (sun_time in ('lt30m', '30m-2h', '2h-4h', 'gt4h')),
  sun_period text not null check (sun_period in ('morning', 'midday', 'afternoon', 'all_day')),
  -- Lista vacía = "Nada".
  protection text[] not null default '{}'
    check (protection <@ array['hat', 'sunglasses', 'sunscreen', 'long_sleeves']),
  skin_type smallint not null check (skin_type between 1 and 6),
  created_at timestamptz not null default now()
);

-- 2. Seguridad (RLS): cada usuario solo puede ver, crear y editar SU perfil.
alter table public.profiles enable row level security;

create policy "Cada usuario ve su perfil" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "Cada usuario crea su perfil" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

create policy "Cada usuario edita su perfil" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 3. Permisos: solo los usuarios con sesión iniciada pueden usar la tabla. Supabase da permisos
--    a los anónimos por defecto; RLS ya los bloquea, pero se los quitamos por si RLS se desactiva.
grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

-- 4. (Añadido después) Avatar prediseñado, opcional: se guarda la clave y la app pone el emoji.
alter table public.profiles
  add column avatar text check (avatar in (
    'farmer_w', 'farmer_m', 'student_w', 'student_m', 'teacher_w', 'teacher_m',
    'office_w', 'office_m', 'worker_w', 'worker_m', 'elder_w', 'elder_m',
    'woman', 'man', 'sun', 'sunflower'
  ));


-- 5. (Añadido después) Foto de perfil propia, opcional y PRIVADA.
--    En la tabla se guarda la ruta del archivo dentro del bucket (null = sin foto). Solo se aceptan
--    rutas dentro de la carpeta del propio usuario.
alter table public.profiles
  add column photo_path text check (photo_path like id::text || '/%');

--    Bucket privado "avatars": máximo 1 MB por archivo y solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp']);

--    Cada usuario solo puede ver, subir y borrar archivos dentro de su carpeta: avatars/<su id>/...
--    (sin regla de "update": cada foto nueva se sube con otro nombre y la anterior se borra).
create policy "Cada usuario ve su foto" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Cada usuario sube su foto" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Cada usuario borra su foto" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
