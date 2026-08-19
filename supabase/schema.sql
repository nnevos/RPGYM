-- RPG GYM - Supabase Auth/Profile foundation
-- Run this file in Supabase > SQL Editor after creating the project.
-- Designed for: Data API ON, Automatically expose new tables OFF,
-- automatic RLS ON (the script also explicitly enables RLS for safety).

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Jogador',
  phone text,
  physiological_sex text check (physiological_sex in ('masculino', 'feminino', 'nao_informado')),
  birth_date date,
  weight_kg numeric(6,2) check (weight_kg is null or (weight_kg >= 20 and weight_kg <= 400)),
  height_cm integer check (height_cm is null or (height_cm >= 80 and height_cm <= 250)),
  goal text,
  activity_level text,
  onboarding_completed boolean not null default false,
  tutorial_completed boolean not null default false,
  tutorial_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- When "Automatically expose new tables" is disabled, explicitly grant only
-- the operations the browser client needs. RLS still decides which rows.
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;

-- Own-profile only policies.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- Create a minimal profile automatically after Auth signup.
-- The browser later completes the onboarding fields using an authenticated UPDATE.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();


create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  game_state jsonb not null default '{}'::jsonb,
  diet_state jsonb not null default '{}'::jsonb,
  client_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

revoke all on table public.game_saves from anon;
revoke all on table public.game_saves from authenticated;
grant select, insert, update on table public.game_saves to authenticated;

drop policy if exists "game_saves_select_own" on public.game_saves;
create policy "game_saves_select_own"
on public.game_saves
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "game_saves_insert_own" on public.game_saves;
create policy "game_saves_insert_own"
on public.game_saves
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "game_saves_update_own" on public.game_saves;
create policy "game_saves_update_own"
on public.game_saves
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop trigger if exists game_saves_set_updated_at on public.game_saves;
create trigger game_saves_set_updated_at
before update on public.game_saves
for each row execute procedure public.set_updated_at();


commit;
