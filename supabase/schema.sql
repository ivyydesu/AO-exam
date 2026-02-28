-- Enable extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role text not null check (role in ('student', 'tutor', 'admin')),
  school text,
  line_user_id text unique,
  stripe_account_id text,
  created_at timestamptz default now()
);

alter table profiles
add column if not exists is_suspended boolean not null default false;
alter table profiles
add column if not exists suspended_until timestamptz;
alter table profiles
add column if not exists suspended_reason text;

-- LINE connection states (short-lived, for OAuth CSRF protection)
create table if not exists line_link_states (
  state text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Tutor verification workflow
create table if not exists tutor_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  student_id_image_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table tutor_verifications
add column if not exists student_id_front_image_path text;
alter table tutor_verifications
add column if not exists student_id_back_image_path text;
alter table tutor_verifications
add column if not exists admission_year integer;
alter table tutor_verifications
add column if not exists graduation_year integer;

-- Public tutor profile for search and listing
create table if not exists tutor_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  avatar_url text,
  cover_url text,
  university text not null default '',
  department text not null default '',
  seminar text not null default '',
  grade text not null default '',
  research_theme text not null default '',
  coaching_experience text not null default '',
  is_published boolean not null default false,
  bio text not null default '',
  updated_at timestamptz default now()
);

alter table tutor_profiles
add column if not exists is_published boolean not null default false;
alter table tutor_profiles
add column if not exists cover_url text;

-- Per-user notification preferences
create table if not exists notification_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  email_new_request boolean not null default true,
  email_new_message boolean not null default true,
  email_favorite boolean not null default false,
  email_ops boolean not null default true,
  email_2fa_enabled boolean not null default false,
  push_reminder boolean not null default true,
  line_enabled boolean not null default true,
  line_new_request boolean not null default true,
  line_status_update boolean not null default true,
  line_new_message boolean not null default true,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table notification_settings
add column if not exists email_2fa_enabled boolean not null default false;

-- Requests
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  tutor_id uuid references profiles(id),
  title text not null,
  description text not null,
  budget integer not null check (budget >= 0),
  status text not null default 'draft',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Reviews
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz default now()
);

-- Request detail form (4-step + pricing)
create table if not exists request_details (
  request_id uuid primary key references requests(id) on delete cascade,
  support_topic text not null default '',
  support_method text not null default '',
  estimated_duration text not null default '',
  requested_deadline date,
  suggested_price integer not null default 0,
  requested_price integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists call_sessions (
  request_id uuid primary key references requests(id) on delete cascade,
  room_name text not null unique,
  room_password text not null,
  moderator_user_id uuid not null references profiles(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  recording_status text not null default 'idle' check (recording_status in ('idle', 'recording')),
  started_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists call_participants (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  participant_role text not null check (participant_role in ('student', 'tutor')),
  is_moderator boolean not null default false,
  joined_at timestamptz default now(),
  left_at timestamptz
);

create table if not exists call_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_user_id uuid references profiles(id) on delete set null,
  request_id uuid references requests(id) on delete set null,
  report_type text not null check (report_type in ('user', 'request', 'message', 'call', 'other')),
  category text not null,
  details text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Realtime (for chat)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- View for request list
create or replace view requests_with_profile as
select
  r.id,
  r.title,
  r.description,
  r.budget,
  r.status,
  r.created_at,
  r.requester_id,
  r.tutor_id,
  r.stripe_payment_intent_id,
  r.stripe_checkout_session_id,
  p.full_name as requester_name,
  t.full_name as tutor_name
from requests r
left join profiles p on r.requester_id = p.id
left join profiles t on r.tutor_id = t.id;

-- RLS
alter table profiles enable row level security;
alter table requests enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;
alter table request_details enable row level security;
alter table call_sessions enable row level security;
alter table call_participants enable row level security;
alter table call_events enable row level security;
alter table reports enable row level security;
alter table line_link_states enable row level security;
alter table tutor_verifications enable row level security;
alter table tutor_profiles enable row level security;
alter table notification_settings enable row level security;

-- Profiles policies
create policy "profiles_select" on profiles
  for select using (auth.uid() is not null);

create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

create policy "line_link_states_service_only" on line_link_states
  for all using (false) with check (false);

create policy "tutor_verifications_select_own_or_admin" on tutor_verifications
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "tutor_verifications_insert_own" on tutor_verifications
  for insert with check (auth.uid() = user_id);

create policy "tutor_verifications_update_admin_only" on tutor_verifications
  for update using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "tutor_profiles_select_all" on tutor_profiles;
create policy "tutor_profiles_select_all" on tutor_profiles
  for select using (true);

drop policy if exists "tutor_profiles_insert_own" on tutor_profiles;
create policy "tutor_profiles_insert_own" on tutor_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "tutor_profiles_update_own" on tutor_profiles;
create policy "tutor_profiles_update_own" on tutor_profiles
  for update using (auth.uid() = user_id);

drop policy if exists "notification_settings_select_own" on notification_settings;
create policy "notification_settings_select_own" on notification_settings
  for select using (auth.uid() = user_id);

drop policy if exists "notification_settings_insert_own" on notification_settings;
create policy "notification_settings_insert_own" on notification_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "notification_settings_update_own" on notification_settings;
create policy "notification_settings_update_own" on notification_settings
  for update using (auth.uid() = user_id);

-- Requests policies
create policy "requests_select" on requests
  for select using (auth.uid() is not null);

create policy "requests_insert" on requests
  for insert with check (auth.uid() = requester_id);

create policy "requests_update" on requests
  for update using (auth.uid() = requester_id or auth.uid() = tutor_id);

-- Messages policies
create policy "messages_select" on messages
  for select using (auth.uid() is not null);

create policy "messages_insert" on messages
  for insert with check (auth.uid() = sender_id);

-- Reviews policies
create policy "reviews_select" on reviews
  for select using (auth.uid() is not null);

create policy "reviews_insert" on reviews
  for insert with check (auth.uid() = reviewer_id);

drop policy if exists "request_details_select" on request_details;
create policy "request_details_select" on request_details
  for select using (auth.uid() is not null);

drop policy if exists "request_details_insert" on request_details;
create policy "request_details_insert" on request_details
  for insert with check (
    exists (
      select 1 from requests r
      where r.id = request_id and r.requester_id = auth.uid()
    )
  );

drop policy if exists "request_details_update" on request_details;
create policy "request_details_update" on request_details
  for update using (
    exists (
      select 1 from requests r
      where r.id = request_id and (r.requester_id = auth.uid() or r.tutor_id = auth.uid())
    )
  );

drop policy if exists "call_sessions_select_participants" on call_sessions;
create policy "call_sessions_select_participants" on call_sessions
  for select using (
    exists (
      select 1 from requests r
      where r.id = request_id and (r.requester_id = auth.uid() or r.tutor_id = auth.uid())
    )
  );

drop policy if exists "call_participants_select_participants" on call_participants;
create policy "call_participants_select_participants" on call_participants
  for select using (
    exists (
      select 1 from requests r
      where r.id = request_id and (r.requester_id = auth.uid() or r.tutor_id = auth.uid())
    )
  );

drop policy if exists "call_events_select_participants" on call_events;
create policy "call_events_select_participants" on call_events
  for select using (
    exists (
      select 1 from requests r
      where r.id = request_id and (r.requester_id = auth.uid() or r.tutor_id = auth.uid())
    )
  );

drop policy if exists "reports_select_own_or_admin" on reports;
create policy "reports_select_own_or_admin" on reports
  for select using (
    auth.uid() = reporter_id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "reports_insert_own" on reports;
create policy "reports_insert_own" on reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_update_admin_only" on reports;
create policy "reports_update_admin_only" on reports
  for update using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Grants for view
grant select on requests_with_profile to authenticated;

-- Storage bucket for student IDs (private)
insert into storage.buckets (id, name, public)
values ('student-ids', 'student-ids', false)
on conflict (id) do nothing;

-- Demo tables for no-login MVP
create table if not exists demo_tutors (
  id text primary key,
  name text not null,
  university text not null,
  department text not null,
  year text,
  cram_school text,
  theme text,
  experience text,
  accepted_universities text[] not null,
  taught_count int not null,
  rating numeric not null,
  reviews int not null,
  specialties text[] not null,
  price int not null,
  avatar_url text not null
);

create table if not exists demo_services (
  id text primary key,
  tutor_id text not null references demo_tutors(id) on delete cascade,
  title text not null,
  description text not null,
  tags text[] not null,
  price int not null,
  rating numeric not null,
  reviews int not null,
  sales int not null,
  delivery text not null,
  flow text[] not null
);

create table if not exists demo_categories (
  id text primary key,
  name text not null
);

create table if not exists demo_tutor_categories (
  tutor_id text not null references demo_tutors(id) on delete cascade,
  category_id text not null references demo_categories(id) on delete cascade,
  primary key (tutor_id, category_id)
);

create table if not exists demo_favorites (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  service_id text not null references demo_services(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  tutor_id text not null references demo_tutors(id) on delete cascade,
  title text not null,
  description text not null,
  budget int not null,
  status text not null default 'draft',
  payment_intent_id text,
  chat_id text,
  created_at timestamptz default now()
);

create table if not exists demo_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references demo_requests(id) on delete cascade,
  sender_role text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists demo_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id text not null references demo_services(id) on delete cascade,
  reviewer_name text not null,
  rating int not null,
  review_text text not null,
  created_at timestamptz default now()
);

alter table demo_tutors enable row level security;
alter table demo_services enable row level security;
alter table demo_categories enable row level security;
alter table demo_tutor_categories enable row level security;
alter table demo_favorites enable row level security;
alter table demo_requests enable row level security;
alter table demo_messages enable row level security;
alter table demo_reviews enable row level security;

create policy "demo_tutors_public" on demo_tutors for select using (true);
create policy "demo_services_public" on demo_services for select using (true);
create policy "demo_categories_public" on demo_categories for select using (true);
create policy "demo_tutor_categories_public" on demo_tutor_categories for select using (true);

create policy "demo_favorites_public" on demo_favorites for select using (true);
create policy "demo_favorites_insert" on demo_favorites for insert with check (true);
create policy "demo_favorites_delete" on demo_favorites for delete using (true);

create policy "demo_requests_public" on demo_requests for select using (true);
create policy "demo_requests_insert" on demo_requests for insert with check (true);
create policy "demo_requests_update" on demo_requests for update using (true);

create policy "demo_messages_public" on demo_messages for select using (true);
create policy "demo_messages_insert" on demo_messages for insert with check (true);

create policy "demo_reviews_public" on demo_reviews for select using (true);
create policy "demo_reviews_insert" on demo_reviews for insert with check (true);

-- Seed data
insert into demo_tutors (id, name, university, department, year, cram_school, theme, experience, accepted_universities, taught_count, rating, reviews, specialties, price, avatar_url)
values
  ('tutor-1','佐藤 亮太','成蹊大学','法学部政治学科','2年','早稲田塾','教育行政といじめ問題について','個人的なサポートで成蹊大学法学部に3名合格', array['成蹊大学 法学部政治学科'],128,4.8,42, array['志望理由書','面接','活動実績の言語化'],15000,''),
  ('tutor-2','山本 なお','慶應義塾大学','環境情報学部','2年','なし','地域の防災とコミュニティ形成','面接対策の個別サポート20名', array['慶應義塾大学 SFC','ICU 教養学部'],86,4.6,30, array['探究テーマ設計','ポートフォリオ','自己PR'],18000,''),
  ('tutor-3','高橋 遼','上智大学','総合グローバル学部','4年','河合塾','国際協力と教育支援','書類添削と面接練習を35名サポート', array['ICU 教養学部','明治大学 国際日本学部'],102,4.9,55, array['英語面接','留学経験','国際系志望'],20000,'')
on conflict (id) do nothing;

insert into demo_services (id, tutor_id, title, description, tags, price, rating, reviews, sales, delivery, flow)
values
  ('tutor-1','tutor-1','志望理由書をプロ目線で添削します','AO対策の核となる志望理由書を磨きます。', array['志望理由書','自己PR','面接','AO対策'],15000,4.8,42,120,'3日', array['ヒアリング','初稿提出','修正','最終納品']),
  ('tutor-2','tutor-2','SFC特化の探究テーマ設計を支援します','SFCの評価軸に合わせた探究テーマを作ります。', array['探究','SFC','ポートフォリオ'],18000,4.6,30,86,'5日', array['ヒアリング','テーマ設計','仮説整理','最終提出']),
  ('tutor-3','tutor-3','英語面接を実戦形式で練習します','英語面接の質問対策と回答改善。', array['英語面接','国際系','面接'],20000,4.9,55,140,'2日', array['ヒアリング','質問整理','模擬面接','フィードバック'])
on conflict (id) do nothing;

insert into demo_categories (id, name) values
  ('c1','志望理由書・自己PR'),
  ('c2','面接練習'),
  ('c3','探究テーマ設計'),
  ('c4','英語面接対策')
on conflict (id) do nothing;

insert into demo_tutor_categories (tutor_id, category_id) values
  ('tutor-1','c1'), ('tutor-1','c2'),
  ('tutor-2','c3'),
  ('tutor-3','c4')
on conflict do nothing;
