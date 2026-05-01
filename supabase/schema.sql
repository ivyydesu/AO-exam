-- =========================================================
-- Unibridge / Supabase full bootstrap schema
-- Safe to re-run (idempotent-oriented)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'tutor', 'admin', 'university', 'mentor')),
  school text,
  accepted_school text,
  line_user_id text unique,
  stripe_account_id text,
  is_suspended boolean not null default false,
  suspended_until timestamptz,
  suspended_reason text,
  onboarding_completed boolean not null default false,
  has_seen_tutorial boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists school text;
alter table public.profiles add column if not exists accepted_school text;
alter table public.profiles add column if not exists line_user_id text;
alter table public.profiles add column if not exists stripe_account_id text;
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists suspended_until timestamptz;
alter table public.profiles add column if not exists suspended_reason text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists has_seen_tutorial boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_profiles_line_user_id on public.profiles(line_user_id) where line_user_id is not null;
create index if not exists idx_profiles_role on public.profiles(role);

create table if not exists public.line_link_states (
  state text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.line_link_states add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.line_link_states add column if not exists expires_at timestamptz;
alter table public.line_link_states add column if not exists created_at timestamptz not null default now();

create index if not exists idx_line_link_states_expires_at on public.line_link_states(expires_at);

create table if not exists public.tutor_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  student_id_image_path text,
  student_id_front_image_path text,
  student_id_back_image_path text,
  admission_year integer,
  graduation_year integer,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tutor_verifications add column if not exists student_id_image_path text;
alter table public.tutor_verifications add column if not exists student_id_front_image_path text;
alter table public.tutor_verifications add column if not exists student_id_back_image_path text;
alter table public.tutor_verifications add column if not exists admission_year integer;
alter table public.tutor_verifications add column if not exists graduation_year integer;
alter table public.tutor_verifications add column if not exists status text not null default 'pending';
alter table public.tutor_verifications add column if not exists reason text;
alter table public.tutor_verifications add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.tutor_verifications add column if not exists reviewed_at timestamptz;
alter table public.tutor_verifications add column if not exists created_at timestamptz not null default now();
alter table public.tutor_verifications add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_tutor_verifications_status on public.tutor_verifications(status);
create index if not exists idx_tutor_verifications_reviewed_at on public.tutor_verifications(reviewed_at desc);

create table if not exists public.tutor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  nickname text not null default '',
  avatar_url text,
  cover_url text,
  university text not null default '',
  accepted_school text not null default '',
  department text not null default '',
  seminar text not null default '',
  grade text not null default '',
  research_theme text not null default '',
  coaching_experience text not null default '',
  bio text not null default '',
  is_published boolean not null default false,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.tutor_profiles add column if not exists nickname text not null default '';
alter table public.tutor_profiles add column if not exists avatar_url text;
alter table public.tutor_profiles add column if not exists cover_url text;
alter table public.tutor_profiles add column if not exists university text not null default '';
alter table public.tutor_profiles add column if not exists accepted_school text not null default '';
alter table public.tutor_profiles add column if not exists department text not null default '';
alter table public.tutor_profiles add column if not exists seminar text not null default '';
alter table public.tutor_profiles add column if not exists grade text not null default '';
alter table public.tutor_profiles add column if not exists research_theme text not null default '';
alter table public.tutor_profiles add column if not exists coaching_experience text not null default '';
alter table public.tutor_profiles add column if not exists bio text not null default '';
alter table public.tutor_profiles add column if not exists is_published boolean not null default false;
alter table public.tutor_profiles add column if not exists is_public boolean not null default false;
alter table public.tutor_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.tutor_profiles add column if not exists created_at timestamptz not null default now();

create index if not exists idx_tutor_profiles_published on public.tutor_profiles(is_published);

create table if not exists public.notification_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
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
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.notification_settings add column if not exists email_new_request boolean not null default true;
alter table public.notification_settings add column if not exists email_new_message boolean not null default true;
alter table public.notification_settings add column if not exists email_favorite boolean not null default false;
alter table public.notification_settings add column if not exists email_ops boolean not null default true;
alter table public.notification_settings add column if not exists email_2fa_enabled boolean not null default false;
alter table public.notification_settings add column if not exists push_reminder boolean not null default true;
alter table public.notification_settings add column if not exists line_enabled boolean not null default true;
alter table public.notification_settings add column if not exists line_new_request boolean not null default true;
alter table public.notification_settings add column if not exists line_status_update boolean not null default true;
alter table public.notification_settings add column if not exists line_new_message boolean not null default true;
alter table public.notification_settings add column if not exists updated_at timestamptz not null default now();
alter table public.notification_settings add column if not exists created_at timestamptz not null default now();

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  tutor_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  budget integer not null check (budget >= 0),
  status text not null default 'draft',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.requests add column if not exists requester_id uuid references public.profiles(id) on delete cascade;
alter table public.requests add column if not exists tutor_id uuid references public.profiles(id) on delete set null;
alter table public.requests add column if not exists title text;
alter table public.requests add column if not exists description text;
alter table public.requests add column if not exists budget integer;
alter table public.requests add column if not exists status text not null default 'draft';
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add column if not exists stripe_checkout_session_id text;
alter table public.requests add column if not exists stripe_payment_intent_id text;
alter table public.requests add column if not exists created_at timestamptz not null default now();
alter table public.requests add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_requests_requester on public.requests(requester_id, created_at desc);
create index if not exists idx_requests_tutor on public.requests(tutor_id, created_at desc);
create index if not exists idx_requests_status_created on public.requests(status, created_at desc);
create index if not exists idx_requests_checkout_session on public.requests(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create index if not exists idx_requests_payment_intent on public.requests(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

create table if not exists public.request_details (
  request_id uuid primary key references public.requests(id) on delete cascade,
  support_topic text not null default '',
  support_method text not null default '',
  estimated_duration text not null default '',
  requested_deadline date,
  suggested_price integer not null default 0,
  requested_price integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.request_details add column if not exists support_topic text not null default '';
alter table public.request_details add column if not exists support_method text not null default '';
alter table public.request_details add column if not exists estimated_duration text not null default '';
alter table public.request_details add column if not exists requested_deadline date;
alter table public.request_details add column if not exists suggested_price integer not null default 0;
alter table public.request_details add column if not exists requested_price integer not null default 0;
alter table public.request_details add column if not exists created_at timestamptz not null default now();
alter table public.request_details add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_request_details_deadline on public.request_details(requested_deadline);

create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  tutor_id uuid not null references public.profiles(id) on delete cascade,
  group_type text not null default 'paid' check (group_type in ('paid')),
  created_at timestamptz not null default now()
);

alter table public.chat_groups add column if not exists student_id uuid references public.profiles(id) on delete cascade;
alter table public.chat_groups add column if not exists tutor_id uuid references public.profiles(id) on delete cascade;
alter table public.chat_groups add column if not exists group_type text not null default 'paid';
alter table public.chat_groups add column if not exists created_at timestamptz not null default now();

create index if not exists idx_chat_groups_student on public.chat_groups(student_id);
create index if not exists idx_chat_groups_tutor on public.chat_groups(tutor_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  message_kind text not null default 'chat' check (message_kind in ('chat', 'file', 'prepay', 'system')),
  expires_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists request_id uuid references public.requests(id) on delete cascade;
alter table public.messages add column if not exists sender_id uuid references public.profiles(id) on delete cascade;
alter table public.messages add column if not exists content text;
alter table public.messages add column if not exists message_kind text not null default 'chat';
alter table public.messages add column if not exists expires_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists deleted_by uuid references public.profiles(id) on delete set null;
alter table public.messages add column if not exists created_at timestamptz not null default now();

create index if not exists idx_messages_request_created on public.messages(request_id, created_at);
create index if not exists idx_messages_expires_at on public.messages(expires_at);
create index if not exists idx_messages_request_deleted_created on public.messages(request_id, deleted_at, created_at desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now()
);

alter table public.reviews add column if not exists request_id uuid references public.requests(id) on delete cascade;
alter table public.reviews add column if not exists reviewer_id uuid references public.profiles(id) on delete cascade;
alter table public.reviews add column if not exists rating integer;
alter table public.reviews add column if not exists review_text text;
alter table public.reviews add column if not exists created_at timestamptz not null default now();

create index if not exists idx_reviews_request on public.reviews(request_id);
create index if not exists idx_reviews_reviewer on public.reviews(reviewer_id);

create table if not exists public.call_sessions (
  request_id uuid primary key references public.requests(id) on delete cascade,
  room_name text not null unique,
  room_password text not null,
  moderator_user_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  recording_status text not null default 'idle' check (recording_status in ('idle', 'recording')),
  started_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.call_sessions add column if not exists room_name text;
alter table public.call_sessions add column if not exists room_password text;
alter table public.call_sessions add column if not exists moderator_user_id uuid references public.profiles(id) on delete cascade;
alter table public.call_sessions add column if not exists created_by uuid references public.profiles(id) on delete cascade;
alter table public.call_sessions add column if not exists recording_status text not null default 'idle';
alter table public.call_sessions add column if not exists started_at timestamptz;
alter table public.call_sessions add column if not exists ended_at timestamptz;
alter table public.call_sessions add column if not exists updated_at timestamptz not null default now();
alter table public.call_sessions add column if not exists created_at timestamptz not null default now();

create index if not exists idx_call_sessions_room_name on public.call_sessions(room_name);

create table if not exists public.call_participants (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  participant_role text not null check (participant_role in ('student', 'tutor')),
  is_moderator boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

alter table public.call_participants add column if not exists request_id uuid references public.requests(id) on delete cascade;
alter table public.call_participants add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.call_participants add column if not exists participant_role text;
alter table public.call_participants add column if not exists is_moderator boolean not null default false;
alter table public.call_participants add column if not exists joined_at timestamptz not null default now();
alter table public.call_participants add column if not exists left_at timestamptz;

create index if not exists idx_call_participants_request_user on public.call_participants(request_id, user_id);
create index if not exists idx_call_participants_request_active on public.call_participants(request_id, left_at);

create table if not exists public.call_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.call_events add column if not exists request_id uuid references public.requests(id) on delete cascade;
alter table public.call_events add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.call_events add column if not exists event_type text;
alter table public.call_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.call_events add column if not exists created_at timestamptz not null default now();

create index if not exists idx_call_events_request_created on public.call_events(request_id, created_at desc);
create index if not exists idx_call_events_user_created on public.call_events(user_id, created_at desc);

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
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.reports add column if not exists reporter_id uuid references public.profiles(id) on delete cascade;
alter table public.reports add column if not exists target_user_id uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists request_id uuid references public.requests(id) on delete set null;
alter table public.reports add column if not exists report_type text;
alter table public.reports add column if not exists category text;
alter table public.reports add column if not exists details text not null default '';
alter table public.reports add column if not exists status text not null default 'open';
alter table public.reports add column if not exists admin_note text;
alter table public.reports add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists updated_at timestamptz not null default now();
alter table public.reports add column if not exists created_at timestamptz not null default now();

create index if not exists idx_reports_created_at on public.reports(created_at desc);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_report_type on public.reports(report_type);
create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_target_user_id on public.reports(target_user_id);
create index if not exists idx_reports_request_id on public.reports(request_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  type text not null default 'system',
  meta jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists body text;
alter table public.notifications add column if not exists href text;
alter table public.notifications add column if not exists type text not null default 'system';
alter table public.notifications add column if not exists meta jsonb;
alter table public.notifications add column if not exists is_read boolean not null default false;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists is_deleted boolean not null default false;
alter table public.notifications add column if not exists deleted_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz not null default now();
alter table public.notifications add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_deleted_created on public.notifications(user_id, is_deleted, created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read) where is_deleted = false;

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

create index if not exists idx_security_audit_logs_created_at on public.security_audit_logs(created_at desc);
create index if not exists idx_security_audit_logs_actor_id on public.security_audit_logs(actor_id);
create index if not exists idx_security_audit_logs_event_type on public.security_audit_logs(event_type);

create table if not exists public.platform_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value)
values ('platform_fee_percent', '30')
on conflict (key) do nothing;

-- ---------------------------------------------------------
-- View
-- ---------------------------------------------------------

drop view if exists public.requests_with_profile;

create or replace view public.requests_with_profile as
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
  p.role as requester_role,
  t.full_name as tutor_name,
  t.role as tutor_role
from public.requests r
left join public.profiles p on p.id = r.requester_id
left join public.profiles t on t.id = r.tutor_id;

grant select on public.requests_with_profile to authenticated;

-- ---------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ---------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('student-ids', 'student-ids', false),
  ('avatars', 'avatars', true),
  ('call-attachments', 'call-attachments', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------
-- Demo tables
-- ---------------------------------------------------------

create table if not exists public.demo_tutors (
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

create table if not exists public.demo_services (
  id text primary key,
  tutor_id text not null references public.demo_tutors(id) on delete cascade,
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

create table if not exists public.demo_categories (
  id text primary key,
  name text not null
);

create table if not exists public.demo_tutor_categories (
  tutor_id text not null references public.demo_tutors(id) on delete cascade,
  category_id text not null references public.demo_categories(id) on delete cascade,
  primary key (tutor_id, category_id)
);

create table if not exists public.demo_favorites (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  service_id text not null references public.demo_services(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  tutor_id text not null references public.demo_tutors(id) on delete cascade,
  title text not null,
  description text not null,
  budget int not null,
  status text not null default 'draft',
  payment_intent_id text,
  chat_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.demo_requests(id) on delete cascade,
  sender_role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id text not null references public.demo_services(id) on delete cascade,
  reviewer_name text not null,
  rating int not null,
  review_text text not null,
  created_at timestamptz not null default now()
);

insert into public.demo_tutors (id, name, university, department, year, cram_school, theme, experience, accepted_universities, taught_count, rating, reviews, specialties, price, avatar_url)
values
  ('tutor-1','佐藤 亮太','成蹊大学','法学部政治学科','2年','早稲田塾','教育行政といじめ問題について','個人的なサポートで成蹊大学法学部に3名合格', array['成蹊大学 法学部政治学科'],128,4.8,42, array['志望理由書','面接','活動実績の言語化'],15000,''),
  ('tutor-2','山本 なお','慶應義塾大学','環境情報学部','2年','なし','地域の防災とコミュニティ形成','面接対策の個別サポート20名', array['慶應義塾大学 SFC','ICU 教養学部'],86,4.6,30, array['探究テーマ設計','ポートフォリオ','自己PR'],18000,''),
  ('tutor-3','高橋 遼','上智大学','総合グローバル学部','4年','河合塾','国際協力と教育支援','書類添削と面接練習を35名サポート', array['ICU 教養学部','明治大学 国際日本学部'],102,4.9,55, array['英語面接','留学経験','国際系志望'],20000,'')
on conflict (id) do nothing;

insert into public.demo_services (id, tutor_id, title, description, tags, price, rating, reviews, sales, delivery, flow)
values
  ('tutor-1','tutor-1','志望理由書をプロ目線で添削します','AO対策の核となる志望理由書を磨きます。', array['志望理由書','自己PR','面接','AO対策'],15000,4.8,42,120,'3日', array['ヒアリング','初稿提出','修正','最終納品']),
  ('tutor-2','tutor-2','SFC特化の探究テーマ設計を支援します','SFCの評価軸に合わせた探究テーマを作ります。', array['探究','SFC','ポートフォリオ'],18000,4.6,30,86,'5日', array['ヒアリング','テーマ設計','仮説整理','最終提出']),
  ('tutor-3','tutor-3','英語面接を実戦形式で練習します','英語面接の質問対策と回答改善。', array['英語面接','国際系','面接'],20000,4.9,55,140,'2日', array['ヒアリング','質問整理','模擬面接','フィードバック'])
on conflict (id) do nothing;

insert into public.demo_categories (id, name)
values
  ('c1','志望理由書・自己PR'),
  ('c2','面接練習'),
  ('c3','探究テーマ設計'),
  ('c4','英語面接対策')
on conflict (id) do nothing;

insert into public.demo_tutor_categories (tutor_id, category_id)
values
  ('tutor-1','c1'), ('tutor-1','c2'),
  ('tutor-2','c3'),
  ('tutor-3','c4')
on conflict do nothing;

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.line_link_states enable row level security;
alter table public.tutor_verifications enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.notification_settings enable row level security;
alter table public.requests enable row level security;
alter table public.request_details enable row level security;
alter table public.chat_groups enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_events enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.security_audit_logs enable row level security;
alter table public.platform_settings enable row level security;

alter table public.demo_tutors enable row level security;
alter table public.demo_services enable row level security;
alter table public.demo_categories enable row level security;
alter table public.demo_tutor_categories enable row level security;
alter table public.demo_favorites enable row level security;
alter table public.demo_requests enable row level security;
alter table public.demo_messages enable row level security;
alter table public.demo_reviews enable row level security;

-- ---------------------------------------------------------
-- Policies: profiles
-- ---------------------------------------------------------

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
for update using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ---------------------------------------------------------
-- Policies: line_link_states
-- ---------------------------------------------------------

drop policy if exists "line_link_states_service_only" on public.line_link_states;
create policy "line_link_states_service_only" on public.line_link_states
for all using (false) with check (false);

-- ---------------------------------------------------------
-- Policies: tutor_verifications
-- ---------------------------------------------------------

drop policy if exists "tutor_verifications_select_own_or_admin" on public.tutor_verifications;
create policy "tutor_verifications_select_own_or_admin" on public.tutor_verifications
for select using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "tutor_verifications_insert_own" on public.tutor_verifications;
create policy "tutor_verifications_insert_own" on public.tutor_verifications
for insert with check (auth.uid() = user_id);

drop policy if exists "tutor_verifications_update_admin_only" on public.tutor_verifications;
create policy "tutor_verifications_update_admin_only" on public.tutor_verifications
for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ---------------------------------------------------------
-- Policies: tutor_profiles
-- ---------------------------------------------------------

drop policy if exists "tutor_profiles_select_all" on public.tutor_profiles;
create policy "tutor_profiles_select_all" on public.tutor_profiles
for select using (true);

drop policy if exists "tutor_profiles_insert_own" on public.tutor_profiles;
create policy "tutor_profiles_insert_own" on public.tutor_profiles
for insert with check (auth.uid() = user_id);

drop policy if exists "tutor_profiles_update_own" on public.tutor_profiles;
create policy "tutor_profiles_update_own" on public.tutor_profiles
for update using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Policies: notification_settings
-- ---------------------------------------------------------

drop policy if exists "notification_settings_select_own" on public.notification_settings;
create policy "notification_settings_select_own" on public.notification_settings
for select using (auth.uid() = user_id);

drop policy if exists "notification_settings_insert_own" on public.notification_settings;
create policy "notification_settings_insert_own" on public.notification_settings
for insert with check (auth.uid() = user_id);

drop policy if exists "notification_settings_update_own" on public.notification_settings;
create policy "notification_settings_update_own" on public.notification_settings
for update using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Policies: requests
-- ---------------------------------------------------------

drop policy if exists "requests_select" on public.requests;
create policy "requests_select" on public.requests
for select using (auth.uid() is not null);

drop policy if exists "requests_insert" on public.requests;
create policy "requests_insert" on public.requests
for insert with check (auth.uid() = requester_id);

drop policy if exists "requests_update" on public.requests;
create policy "requests_update" on public.requests
for update using (
  auth.uid() = requester_id
  or auth.uid() = tutor_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ---------------------------------------------------------
-- Policies: request_details
-- ---------------------------------------------------------

drop policy if exists "request_details_select" on public.request_details;
create policy "request_details_select" on public.request_details
for select using (auth.uid() is not null);

drop policy if exists "request_details_insert" on public.request_details;
create policy "request_details_insert" on public.request_details
for insert with check (
  exists (
    select 1 from public.requests r
    where r.id = request_id and r.requester_id = auth.uid()
  )
);

drop policy if exists "request_details_update" on public.request_details;
create policy "request_details_update" on public.request_details
for update using (
  exists (
    select 1 from public.requests r
    where r.id = request_id
      and (r.requester_id = auth.uid() or r.tutor_id = auth.uid())
  )
);

-- ---------------------------------------------------------
-- Policies: chat_groups
-- ---------------------------------------------------------

drop policy if exists "chat_groups_select_participants" on public.chat_groups;
create policy "chat_groups_select_participants" on public.chat_groups
for select using (
  student_id = auth.uid()
  or tutor_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "chat_groups_insert_system" on public.chat_groups;
create policy "chat_groups_insert_system" on public.chat_groups
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ---------------------------------------------------------
-- Policies: messages
-- ---------------------------------------------------------

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
for select using (
  exists (
    select 1 from public.requests r
    where r.id = request_id
      and (
        r.requester_id = auth.uid()
        or r.tutor_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
  )
);

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.requests r
    where r.id = request_id
      and (r.requester_id = auth.uid() or r.tutor_id = auth.uid())
  )
);

drop policy if exists "messages_update_own_or_admin" on public.messages;
create policy "messages_update_own_or_admin" on public.messages
for update using (
  sender_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ---------------------------------------------------------
-- Policies: reviews
-- ---------------------------------------------------------

drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews
for select using (auth.uid() is not null);

drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews
for insert with check (auth.uid() = reviewer_id);

-- ---------------------------------------------------------
-- Policies: call tables (select only)
-- ---------------------------------------------------------

drop policy if exists "call_sessions_select_participants" on public.call_sessions;
create policy "call_sessions_select_participants" on public.call_sessions
for select using (
  exists (
    select 1 from public.requests r
    where r.id = request_id
      and (r.requester_id = auth.uid() or r.tutor_id = auth.uid())
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "call_participants_select_participants" on public.call_participants;
create policy "call_participants_select_participants" on public.call_participants
for select using (
  exists (
    select 1 from public.requests r
    where r.id = request_id
      and (r.requester_id = auth.uid() or r.tutor_id = auth.uid())
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "call_events_select_participants" on public.call_events;
create policy "call_events_select_participants" on public.call_events
for select using (
  exists (
    select 1 from public.requests r
    where r.id = request_id
      and (r.requester_id = auth.uid() or r.tutor_id = auth.uid())
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ---------------------------------------------------------
-- Policies: reports
-- ---------------------------------------------------------

drop policy if exists "reports_select_own_or_admin" on public.reports;
drop policy if exists "reports_admin_select" on public.reports;
create policy "reports_select_own_or_admin" on public.reports
for select using (
  auth.uid() = reporter_id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_own" on public.reports
for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_update_admin_only" on public.reports;
drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_update_admin_only" on public.reports
for update using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ---------------------------------------------------------
-- Policies: notifications
-- ---------------------------------------------------------

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
for select using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications
for insert with check (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
for update using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Policies: security_audit_logs
-- ---------------------------------------------------------

drop policy if exists "security_audit_logs_admin_select" on public.security_audit_logs;
create policy "security_audit_logs_admin_select" on public.security_audit_logs
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "security_audit_logs_no_client_insert" on public.security_audit_logs;
create policy "security_audit_logs_no_client_insert" on public.security_audit_logs
for insert with check (false);

drop policy if exists "security_audit_logs_no_client_update" on public.security_audit_logs;
create policy "security_audit_logs_no_client_update" on public.security_audit_logs
for update using (false);

drop policy if exists "security_audit_logs_no_client_delete" on public.security_audit_logs;
create policy "security_audit_logs_no_client_delete" on public.security_audit_logs
for delete using (false);

-- ---------------------------------------------------------
-- Policies: platform_settings
-- ---------------------------------------------------------

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

-- ---------------------------------------------------------
-- Policies: demo tables (public MVP)
-- ---------------------------------------------------------

drop policy if exists "demo_tutors_public" on public.demo_tutors;
create policy "demo_tutors_public" on public.demo_tutors for select using (true);

drop policy if exists "demo_services_public" on public.demo_services;
create policy "demo_services_public" on public.demo_services for select using (true);

drop policy if exists "demo_categories_public" on public.demo_categories;
create policy "demo_categories_public" on public.demo_categories for select using (true);

drop policy if exists "demo_tutor_categories_public" on public.demo_tutor_categories;
create policy "demo_tutor_categories_public" on public.demo_tutor_categories for select using (true);

drop policy if exists "demo_favorites_public" on public.demo_favorites;
create policy "demo_favorites_public" on public.demo_favorites for select using (true);

drop policy if exists "demo_favorites_insert" on public.demo_favorites;
create policy "demo_favorites_insert" on public.demo_favorites for insert with check (true);

drop policy if exists "demo_favorites_delete" on public.demo_favorites;
create policy "demo_favorites_delete" on public.demo_favorites for delete using (true);

drop policy if exists "demo_requests_public" on public.demo_requests;
create policy "demo_requests_public" on public.demo_requests for select using (true);

drop policy if exists "demo_requests_insert" on public.demo_requests;
create policy "demo_requests_insert" on public.demo_requests for insert with check (true);

drop policy if exists "demo_requests_update" on public.demo_requests;
create policy "demo_requests_update" on public.demo_requests for update using (true);

drop policy if exists "demo_messages_public" on public.demo_messages;
create policy "demo_messages_public" on public.demo_messages for select using (true);

drop policy if exists "demo_messages_insert" on public.demo_messages;
create policy "demo_messages_insert" on public.demo_messages for insert with check (true);

drop policy if exists "demo_reviews_public" on public.demo_reviews;
create policy "demo_reviews_public" on public.demo_reviews for select using (true);

drop policy if exists "demo_reviews_insert" on public.demo_reviews;
create policy "demo_reviews_insert" on public.demo_reviews for insert with check (true);

-- ---------------------------------------------------------
-- PostgREST cache reload hint
-- ---------------------------------------------------------

select pg_notify('pgrst', 'reload schema');
