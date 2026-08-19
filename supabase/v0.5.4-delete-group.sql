-- RPG GYM v0.5.4 - hotfix: exclusao segura de grupo
-- Execute uma vez, depois do v0.5.4-groups.sql.

begin;

create or replace function public.delete_social_group(target_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select created_by into current_owner
  from public.groups
  where id = target_group;

  if current_owner is null then
    raise exception 'group not found';
  end if;

  if current_owner <> auth.uid() then
    raise exception 'only the owner can delete this group';
  end if;

  -- group_members deve possuir FK com ON DELETE CASCADE, portanto apagar o
  -- grupo remove apenas os vinculos de participacao. Perfis, saves, treinos,
  -- cardio e dieta dos usuarios permanecem intactos.
  delete from public.groups
  where id = target_group and created_by = auth.uid();
end;
$$;

revoke all on function public.delete_social_group(uuid) from public;
grant execute on function public.delete_social_group(uuid) to authenticated;

commit;
