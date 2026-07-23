-- Run this once in Supabase Dashboard → SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  seq int not null,
  type text not null check (type in ('design', 'dev')),
  location text default '',
  environment text default '',
  issue_text text not null,
  expected_text text default '',
  assignee text default '',
  image_path text,
  status text not null default 'new' check (status in ('new', 'pending', 'clear')),
  rework_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists issue_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  status text not null,
  comment text default '',
  image_path text,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table issues enable row level security;
alter table issue_history enable row level security;

-- Any authenticated user (already gated to @brightbell.co.kr at signup) can read/write everything.
-- This is deliberately simple: single-company internal tool, no per-row ownership needed.
-- (drop-then-create makes this block safe to re-run)
drop policy if exists "authenticated read projects" on projects;
drop policy if exists "authenticated write projects" on projects;
drop policy if exists "authenticated update projects" on projects;
drop policy if exists "authenticated delete projects" on projects;
create policy "authenticated read projects" on projects for select using (auth.role() = 'authenticated');
create policy "authenticated write projects" on projects for insert with check (auth.role() = 'authenticated');
create policy "authenticated update projects" on projects for update using (auth.role() = 'authenticated');
create policy "authenticated delete projects" on projects for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read issues" on issues;
drop policy if exists "authenticated write issues" on issues;
drop policy if exists "authenticated update issues" on issues;
drop policy if exists "authenticated delete issues" on issues;
create policy "authenticated read issues" on issues for select using (auth.role() = 'authenticated');
create policy "authenticated write issues" on issues for insert with check (auth.role() = 'authenticated');
create policy "authenticated update issues" on issues for update using (auth.role() = 'authenticated');
create policy "authenticated delete issues" on issues for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read history" on issue_history;
drop policy if exists "authenticated write history" on issue_history;
create policy "authenticated read history" on issue_history for select using (auth.role() = 'authenticated');
create policy "authenticated write history" on issue_history for insert with check (auth.role() = 'authenticated');

-- Storage bucket for capture images (create the bucket itself in Dashboard → Storage → New bucket → "qa-captures", private).
drop policy if exists "authenticated read captures" on storage.objects;
drop policy if exists "authenticated upload captures" on storage.objects;
drop policy if exists "authenticated delete captures" on storage.objects;
create policy "authenticated read captures" on storage.objects for select
  using (bucket_id = 'qa-captures' and auth.role() = 'authenticated');
create policy "authenticated upload captures" on storage.objects for insert
  with check (bucket_id = 'qa-captures' and auth.role() = 'authenticated');
create policy "authenticated delete captures" on storage.objects for delete
  using (bucket_id = 'qa-captures' and auth.role() = 'authenticated');

-- Drops the earlier (incorrect) trigger-shaped version of this function, if you already ran it.
drop function if exists public.check_company_domain();

-- Domain allowlist: rejects any sign-up attempt for an email that doesn't end with @brightbell.co.kr.
-- Wire this up as a "Before User Created" Auth Hook (Authentication → Hooks in the dashboard),
-- selecting this function once it exists. Supabase calls it directly (not a DB trigger), so it
-- must accept/return jsonb in the exact shape below.
create or replace function public.check_company_domain(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  email text;
begin
  email := event->'user'->>'email';
  if email !~* '@brightbell\.co\.kr$' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'brightbell.co.kr 회사 이메일만 가입할 수 있어요.',
        'http_code', 403
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

-- Only the Auth service may call this hook — block normal API/RPC access to it.
grant execute on function public.check_company_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.check_company_domain(jsonb) from authenticated, anon, public;
