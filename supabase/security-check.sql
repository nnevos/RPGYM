-- RPG GYM security inspection (read-only)
-- Run after v0.6.1-security-hardening.sql. This query changes nothing.

-- 1) RLS must be enabled on every application table.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles','game_saves','groups','group_members','social_profiles')
order by c.relname;

-- 2) Browser table grants. group_members should have SELECT only for authenticated.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles','game_saves','groups','group_members','social_profiles')
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

-- 3) Active RLS policies.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public','storage')
  and tablename in ('profiles','game_saves','groups','group_members','social_profiles','objects')
order by schemaname, tablename, policyname;

-- 4) SECURITY DEFINER functions exposed by the RPG GYM API.
select n.nspname as schema_name,
       p.proname as function_name,
       p.prosecdef as security_definer,
       p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'handle_new_user','is_group_member','shares_group','join_social_group',
    'create_social_group','leave_social_group','delete_social_group','delete_my_account'
  )
order by p.proname;

-- 5) Avatar bucket configuration.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'avatars';
