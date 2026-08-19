-- RPG GYM v0.5.1 - cloud save synchronization
-- Run once in Supabase > SQL Editor after the v0.5.0 schema.

begin;

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
