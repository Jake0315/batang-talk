do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
grant usage on schema auth to authenticated, anon, service_role;
grant usage on schema public to authenticated, anon, service_role;
-- 2026-05-30 이후 새 Supabase 프로젝트처럼, 새 표를 API 역할에 자동으로 열어 주지 않아요.
-- (schema.sql이 필요한 권한을 직접 줘야 점검이 통과해요)
create publication supabase_realtime;
