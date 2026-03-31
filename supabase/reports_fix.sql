-- reports テーブル未作成エラー修正用（再実行安全）

create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete set null,
  request_id uuid references public.requests(id) on delete set null,
  report_type text not null check (report_type in ('user', 'request', 'message', 'call', 'other')),
  category text not null,
  details text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.reports enable row level security;

drop policy if exists "reports_select_own_or_admin" on public.reports;
create policy "reports_select_own_or_admin" on public.reports
  for select using (
    auth.uid() = reporter_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_update_admin_only" on public.reports;
create policy "reports_update_admin_only" on public.reports
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create index if not exists idx_reports_created_at on public.reports (created_at desc);
create index if not exists idx_reports_status on public.reports (status);
create index if not exists idx_reports_report_type on public.reports (report_type);
create index if not exists idx_reports_reporter_id on public.reports (reporter_id);
create index if not exists idx_reports_target_user_id on public.reports (target_user_id);
create index if not exists idx_reports_request_id on public.reports (request_id);

select pg_notify('pgrst', 'reload schema');

