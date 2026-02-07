-- Enable extensions
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role text not null check (role in ('student', 'tutor', 'admin')),
  school text,
  stripe_account_id text,
  created_at timestamptz default now()
);

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

-- Realtime (for chat)
alter publication supabase_realtime add table messages;

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

-- Profiles policies
create policy "profiles_select" on profiles
  for select using (auth.uid() is not null);

create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

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

-- Grants for view
grant select on requests_with_profile to authenticated;
