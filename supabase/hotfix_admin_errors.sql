-- AO Match / ユニブリ hotfix for admin/runtime schema errors
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1) messages.deleted_at が無い問題
-- =========================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  sender_id uuid,
  content text not null default '',
  created_at timestamptz default now()
);

alter table public.messages
  add column if not exists message_kind text not null default 'chat'
  check (message_kind in ('chat', 'file', 'prepay', 'system'));

alter table public.messages
  add column if not exists expires_at timestamptz;

alter table public.messages
  add column if not exists deleted_at timestamptz;

alter table public.messages
  add column if not exists deleted_by uuid;

create index if not exists idx_messages_request_created
  on public.messages(request_id, created_at);

create index if not exists idx_messages_expires_at
  on public.messages(expires_at);

-- =========================================================
-- 2) platform_settings テーブルが無い問題
-- =========================================================
create table if not exists public.platform_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_admin_select" on public.platform_settings;
create policy "platform_settings_admin_select" on public.platform_settings
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "platform_settings_admin_insert" on public.platform_settings;
create policy "platform_settings_admin_insert" on public.platform_settings
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "platform_settings_admin_update" on public.platform_settings;
create policy "platform_settings_admin_update" on public.platform_settings
for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

insert into public.platform_settings (key, value)
values ('platform_fee_percent', '30')
on conflict (key) do nothing;

-- =========================================================
-- 3) reports.details が無い問題
-- =========================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid,
  target_user_id uuid,
  request_id uuid,
  report_type text,
  category text,
  details text not null default '',
  status text not null default 'open',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.reports
  add column if not exists details text not null default '';

alter table public.reports
  add column if not exists report_type text;

alter table public.reports
  add column if not exists category text;

alter table public.reports
  add column if not exists status text not null default 'open';

alter table public.reports
  add column if not exists admin_note text;

alter table public.reports
  add column if not exists reviewed_by uuid;

alter table public.reports
  add column if not exists reviewed_at timestamptz;

alter table public.reports
  add column if not exists updated_at timestamptz default now();

alter table public.reports
  add column if not exists created_at timestamptz default now();

alter table public.reports enable row level security;

drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated" on public.reports
for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_admin_select" on public.reports;
create policy "reports_admin_select" on public.reports
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_admin_update" on public.reports
for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- PostgREST schema cache reload
select pg_notify('pgrst', 'reload schema');
