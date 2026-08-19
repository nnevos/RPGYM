-- RPG GYM v0.6.1 - security hardening audit
-- Execute once AFTER all previous migrations through v0.6.0-beta.sql.
-- This migration removes direct membership writes, hardens SECURITY DEFINER
-- functions, and keeps private player/save data own-user only.

begin;

-- Browser roles must never be able to create objects in public schema.
revoke create on schema public from public;
revoke create on schema public from anon;
revoke create on schema public from authenticated;

-- Explicit grants: private tables are accessible only to authenticated users,
-- and RLS below restricts them to the correct rows.
revoke all on table public.profiles from anon;
revoke all on table public.game_saves from anon;
revoke all on table public.groups from anon;
revoke all on table public.group_members from anon;
revoke all on table public.social_profiles from anon;

revoke all on table public.profiles from authenticated;
revoke all on table public.game_saves from authenticated;
revoke all on table public.groups from authenticated;
revoke all on table public.group_members from authenticated;
revoke all on table public.social_profiles from authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.game_saves to authenticated;
grant select on table public.groups to authenticated;
-- Membership mutations are RPC-only. This prevents clients from choosing role='owner'.
grant select on table public.group_members to authenticated;
grant select, insert, update on table public.social_profiles to authenticated;

-- RLS is explicitly enabled even if automatic RLS is already on.
alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.social_profiles enable row level security;

-- Remove legacy direct membership mutation policies. Membership writes now go
-- through join_social_group / leave_social_group only.
drop policy if exists "group_members_join_public" on public.group_members;
drop policy if exists "group_members_leave_own" on public.group_members;

-- Harden helper functions against search_path manipulation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, phone)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Jogador'),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group
      and gm.user_id = (select auth.uid())
  );
$$;

create or replace function public.shares_group(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user
  );
$$;

-- Joining is server-side only. A user can only add themselves and always as a member.
create or replace function public.join_social_group(target_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_is_public boolean;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if exists (
    select 1 from public.group_members gm where gm.user_id = auth.uid()
  ) then
    raise exception 'user already belongs to a group';
  end if;

  select g.is_public into target_is_public
  from public.groups g
  where g.id = target_group;

  if target_is_public is null then
    raise exception 'group not found';
  end if;

  if target_is_public is not true then
    raise exception 'group is not public';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (target_group, auth.uid(), 'member');
end;
$$;

create or replace function public.create_social_group(
  group_name text,
  group_description text default '',
  group_focus text default 'Equilíbrio'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_group_id uuid;
  clean_name text := trim(regexp_replace(coalesce(group_name, ''), '\s+', ' ', 'g'));
  clean_description text := left(trim(coalesce(group_description, '')), 140);
  clean_focus text := left(trim(coalesce(group_focus, 'Equilíbrio')), 30);
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if char_length(clean_name) < 3 or char_length(clean_name) > 36 then
    raise exception 'group name must contain between 3 and 36 characters';
  end if;

  if exists (select 1 from public.group_members gm where gm.user_id = auth.uid()) then
    raise exception 'user already belongs to a group';
  end if;

  insert into public.groups (name, description, focus, is_public, created_by)
  values (clean_name, clean_description, coalesce(nullif(clean_focus, ''), 'Equilíbrio'), true, auth.uid())
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, auth.uid(), 'owner');

  return new_group_id;
end;
$$;

create or replace function public.leave_social_group(target_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role text;
  next_owner uuid;
  remaining_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select gm.role into current_role
  from public.group_members gm
  where gm.group_id = target_group and gm.user_id = auth.uid();

  if current_role is null then
    raise exception 'user is not a member of this group';
  end if;

  if current_role <> 'owner' then
    delete from public.group_members gm
    where gm.group_id = target_group and gm.user_id = auth.uid();
    return;
  end if;

  select count(*) into remaining_count
  from public.group_members gm
  where gm.group_id = target_group and gm.user_id <> auth.uid();

  if remaining_count = 0 then
    delete from public.groups g where g.id = target_group and g.created_by = auth.uid();
    return;
  end if;

  select gm.user_id into next_owner
  from public.group_members gm
  where gm.group_id = target_group and gm.user_id <> auth.uid()
  order by case gm.role when 'admin' then 0 else 1 end, gm.joined_at asc
  limit 1;

  update public.group_members gm
  set role = 'owner'
  where gm.group_id = target_group and gm.user_id = next_owner;

  update public.groups g
  set created_by = next_owner
  where g.id = target_group and g.created_by = auth.uid();

  delete from public.group_members gm
  where gm.group_id = target_group and gm.user_id = auth.uid();
end;
$$;

create or replace function public.delete_social_group(target_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select g.created_by into current_owner
  from public.groups g
  where g.id = target_group;

  if current_owner is null then
    raise exception 'group not found';
  end if;

  if current_owner <> auth.uid() then
    raise exception 'only the owner can delete this group';
  end if;

  delete from public.groups g
  where g.id = target_group and g.created_by = auth.uid();
end;
$$;

-- Re-assert self-service deletion with a fixed search_path.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_group uuid;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  select gm.group_id into current_group
  from public.group_members gm
  where gm.user_id = uid
  limit 1;

  if current_group is not null then
    perform public.leave_social_group(current_group);
  end if;

  delete from storage.objects so
  where so.bucket_id = 'avatars'
    and (storage.foldername(so.name))[1] = uid::text;

  delete from auth.users au where au.id = uid;
end;
$$;

-- SECURITY DEFINER functions are callable only by authenticated clients where intended.
revoke all on function public.handle_new_user() from public, anon, authenticated;
-- Trigger function doesn't need client EXECUTE.
revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.shares_group(uuid) from public, anon;
revoke all on function public.join_social_group(uuid) from public, anon;
revoke all on function public.create_social_group(text,text,text) from public, anon;
revoke all on function public.leave_social_group(uuid) from public, anon;
revoke all on function public.delete_social_group(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.shares_group(uuid) to authenticated;
grant execute on function public.join_social_group(uuid) to authenticated;
grant execute on function public.create_social_group(text,text,text) to authenticated;
grant execute on function public.leave_social_group(uuid) to authenticated;
grant execute on function public.delete_social_group(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- Avatar bucket remains public by product choice: profile pictures are social/public
-- assets. Upload/update/delete remain restricted to the user's own UUID folder.
update storage.buckets
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[]
where id = 'avatars';

-- Recreate own-folder write policies explicitly.
drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars_select_own_folder" on storage.objects;
create policy "avatars_select_own_folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects for update to authenticated
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
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
