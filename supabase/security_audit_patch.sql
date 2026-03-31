-- ユニブリ Security Patch (Audit Logs + RLS hardening helper)
-- Run in Supabase SQL Editor (safe re-run)

create extension if not exists pgcrypto;

create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  resource_type text,
  resource_id text,
  result text not null check (result in ('success', 'failure')),
  detail text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_audit_logs_created_at
  on public.security_audit_logs (created_at desc);

create index if not exists idx_security_audit_logs_actor_id
  on public.security_audit_logs (actor_id);

create index if not exists idx_security_audit_logs_event_type
  on public.security_audit_logs (event_type);

alter table public.security_audit_logs enable row level security;

drop policy if exists "security_audit_logs_admin_select" on public.security_audit_logs;
create policy "security_audit_logs_admin_select"
on public.security_audit_logs
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- Inserts are done by service-role server API only.
drop policy if exists "security_audit_logs_no_client_insert" on public.security_audit_logs;
create policy "security_audit_logs_no_client_insert"
on public.security_audit_logs
for insert
with check (false);

drop policy if exists "security_audit_logs_no_client_update" on public.security_audit_logs;
create policy "security_audit_logs_no_client_update"
on public.security_audit_logs
for update
using (false);

drop policy if exists "security_audit_logs_no_client_delete" on public.security_audit_logs;
create policy "security_audit_logs_no_client_delete"
on public.security_audit_logs
for delete
using (false);

-- Keep query planner cache in sync for PostgREST
select pg_notify('pgrst', 'reload schema');
