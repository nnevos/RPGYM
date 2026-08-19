begin;

create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  focus text not null default 'Equilíbrio',
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin','owner')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id),
  unique (user_id)
);

create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Jogador',
  title text not null default 'Novato',
  global_level integer not null default 1 check (global_level between 1 and 50),
  attributes jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  exercises jsonb not null default '{}'::jsonb,
  latest_activity jsonb,
  updated_at timestamptz not null default now()
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.social_profiles enable row level security;

revoke all on table public.groups from anon;
revoke all on table public.group_members from anon;
revoke all on table public.social_profiles from anon;
revoke all on table public.groups from authenticated;
revoke all on table public.group_members from authenticated;
revoke all on table public.social_profiles from authenticated;

grant select on table public.groups to authenticated;
grant select, insert, delete on table public.group_members to authenticated;
grant select, insert, update on table public.social_profiles to authenticated;

create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.shares_group(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.shares_group(uuid) to authenticated;

drop policy if exists "groups_authenticated_read" on public.groups;
create policy "groups_authenticated_read"
on public.groups
for select
to authenticated
using (is_public or public.is_group_member(id));

drop policy if exists "group_members_same_group_read" on public.group_members;
create policy "group_members_same_group_read"
on public.group_members
for select
to authenticated
using (user_id = (select auth.uid()) or public.is_group_member(group_id));

drop policy if exists "group_members_join_public" on public.group_members;
create policy "group_members_join_public"
on public.group_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.groups g
    where g.id = group_id and g.is_public
  )
);

drop policy if exists "group_members_leave_own" on public.group_members;
create policy "group_members_leave_own"
on public.group_members
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "social_profiles_read_group" on public.social_profiles;
create policy "social_profiles_read_group"
on public.social_profiles
for select
to authenticated
using (user_id = (select auth.uid()) or public.shares_group(user_id));

drop policy if exists "social_profiles_insert_own" on public.social_profiles;
create policy "social_profiles_insert_own"
on public.social_profiles
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "social_profiles_update_own" on public.social_profiles;
create policy "social_profiles_update_own"
on public.social_profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
before update on public.groups
for each row execute procedure public.set_updated_at();

drop trigger if exists social_profiles_set_updated_at on public.social_profiles;
create trigger social_profiles_set_updated_at
before update on public.social_profiles
for each row execute procedure public.set_updated_at();

insert into public.groups (id, name, description, focus, is_public)
values
  ('11111111-1111-4111-8111-111111111111', 'Golo', 'Força e constância em equipe.', 'Força', true),
  ('22222222-2222-4222-8222-222222222222', 'Agronegócio', 'Evolução equilibrada e constância.', 'Equilíbrio', true),
  ('33333333-3333-4333-8333-333333333333', 'Rubra', 'Treino sem desculpas e progresso contínuo.', 'Determinação', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  focus = excluded.focus,
  is_public = excluded.is_public;

-- MVP: Postgres Changes é suficiente para manter a lista de integrantes atualizada.
-- Se o projeto crescer muito, migre esta parte para Broadcast privado.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_profiles'
    ) then
      alter publication supabase_realtime add table public.social_profiles;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_members'
    ) then
      alter publication supabase_realtime add table public.group_members;
    end if;
  end if;
end $$;

commit;
