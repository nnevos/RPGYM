-- RPG GYM v0.5.3
-- Foto de perfil via Supabase Storage + campo publico no perfil social.
-- Execute uma vez no Supabase SQL Editor depois dos scripts anteriores.

begin;

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.social_profiles
  add column if not exists avatar_url text;

-- Fotos de perfil sao conteudo publico do perfil. Upload/alteracao continuam
-- protegidos por RLS e limitados a uma pasta com o UID do proprio usuario.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- upsert no Storage exige INSERT e, quando o arquivo ja existe, SELECT + UPDATE.
drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars_select_own_folder" on storage.objects;
create policy "avatars_select_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
