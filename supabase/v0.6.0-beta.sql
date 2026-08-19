-- RPG GYM v0.6.0 - beta readiness: account deletion, storage limits and RLS hardening.
-- Execute once after all v0.5.x migrations.

begin;

-- Avatar uploads are optimized client-side to 512x512 WebP. Keep the bucket strict.
update storage.buckets
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[]
where id = 'avatars';

-- Explicit browser grants. RLS still decides which rows can be touched.
revoke all on table public.profiles from anon;
revoke all on table public.game_saves from anon;
revoke all on table public.group_members from anon;
revoke all on table public.social_profiles from anon;
revoke all on table public.groups from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.game_saves to authenticated;
grant select, insert, delete on table public.group_members to authenticated;
grant select, insert, update on table public.social_profiles to authenticated;
grant select on table public.groups to authenticated;

-- Self-service account deletion. It first leaves/transfers group ownership safely,
-- removes avatar objects, then deletes auth.users. ON DELETE CASCADE handles
-- profiles, game_saves, group_members and social_profiles.
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

  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = uid::text;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

commit;
