-- RPG GYM v0.5.4
-- Criacao e saida segura de grupos.
-- Execute depois dos scripts v0.5.0 -> v0.5.3.

begin;

-- Nomes de grupo passam a ser unicos sem diferenciar maiusculas/minusculas.
create unique index if not exists groups_name_lower_unique
on public.groups (lower(name));

create or replace function public.create_social_group(
  group_name text,
  group_description text default '',
  group_focus text default 'Equilíbrio'
)
returns uuid
language plpgsql
security definer
set search_path = public
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

  if exists (
    select 1 from public.group_members where user_id = auth.uid()
  ) then
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

revoke all on function public.create_social_group(text,text,text) from public;
grant execute on function public.create_social_group(text,text,text) to authenticated;

create or replace function public.leave_social_group(target_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role text;
  next_owner uuid;
  remaining_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select role into current_role
  from public.group_members
  where group_id = target_group and user_id = auth.uid();

  if current_role is null then
    raise exception 'user is not a member of this group';
  end if;

  if current_role <> 'owner' then
    delete from public.group_members
    where group_id = target_group and user_id = auth.uid();
    return;
  end if;

  select count(*) into remaining_count
  from public.group_members
  where group_id = target_group and user_id <> auth.uid();

  if remaining_count = 0 then
    -- O ultimo integrante era o dono: remove o grupo inteiro.
    delete from public.groups where id = target_group;
    return;
  end if;

  -- Transfere a propriedade para o integrante mais antigo antes da saida.
  select user_id into next_owner
  from public.group_members
  where group_id = target_group and user_id <> auth.uid()
  order by
    case role when 'admin' then 0 else 1 end,
    joined_at asc
  limit 1;

  update public.group_members
  set role = 'owner'
  where group_id = target_group and user_id = next_owner;

  update public.groups
  set created_by = next_owner
  where id = target_group;

  delete from public.group_members
  where group_id = target_group and user_id = auth.uid();
end;
$$;

revoke all on function public.leave_social_group(uuid) from public;
grant execute on function public.leave_social_group(uuid) to authenticated;

commit;
