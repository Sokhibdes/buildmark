-- =============================================
-- BuildMark CRM - Supabase Database Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- USERS & AUTH (Supabase Auth bilan bog'liq)
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('owner', 'admin', 'content_manager', 'designer', 'targetologist', 'video_editor', 'operator', 'client')),
  avatar_url text,
  phone text,
  created_at timestamptz default now()
);

-- =============================================
-- CLIENTS (Mijozlar)
-- =============================================
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  company_name text not null,
  contact_name text not null,
  phone text,
  email text,
  industry text default 'construction',
  package text not null check (package in ('starter', 'standard', 'premium', 'full')),
  status text default 'active' check (status in ('active', 'paused', 'completed', 'lead')),
  portal_access boolean default false,
  portal_password text, -- hashed
  notes text,
  logo_url text,
  instagram_url text,
  telegram_url text,
  facebook_url text,
  contract_start date,
  contract_end date,
  monthly_post_count integer default 29,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- WORKFLOWS (Ish jarayonlari)
-- =============================================
create table public.workflow_stages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  order_index integer not null,
  color text default 'blue',
  description text
);

-- Default bosqichlarni qo'shish
insert into public.workflow_stages (name, slug, order_index, color, description) values
  ('Onboarding',       'onboarding',    1, 'gray',   'Mijoz ma''lumotlari, brief olish'),
  ('Strategiya',       'strategy',      2, 'purple', 'Auditoriya tahlili, raqib tahlili'),
  ('Kontent reja',     'content_plan',  3, 'blue',   'Oylik kontent grid va taqvim'),
  ('Ishlab chiqish',   'production',    4, 'amber',  'Dizayn, video, copywriting'),
  ('Tasdiqlash',       'approval',      5, 'coral',  'Ichki tekshiruv va mijoz tasdiqi'),
  ('Nashr',            'publishing',    6, 'teal',   'Post joylashtirish va target yoqish'),
  ('Tahlil',           'analytics',     7, 'green',  'Natijalar tahlili va hisobot');

-- =============================================
-- TASKS (Vazifalar)
-- =============================================
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  client_id uuid references public.clients(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  stage_id uuid references public.workflow_stages(id),
  status text default 'todo' check (status in ('todo', 'in_progress', 'review', 'approved', 'done', 'blocked')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  task_type text check (task_type in ('content', 'design', 'video', 'targeting', 'shooting', 'strategy', 'report', 'other')),
  due_date date,
  completed_at timestamptz,
  visible_to_client boolean default false,
  client_notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- CONTENT (Kontentlar)
-- =============================================
create table public.content_items (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  content_type text check (content_type in ('post', 'story', 'reel', 'video', 'banner', 'carousel')),
  platform text check (platform in ('instagram', 'telegram', 'facebook', 'tiktok', 'youtube')),
  caption text,
  hashtags text[],
  file_urls text[],
  thumbnail_url text,
  status text default 'draft' check (status in ('draft', 'in_review', 'client_approval', 'approved', 'scheduled', 'published', 'rejected')),
  scheduled_for timestamptz,
  published_at timestamptz,
  client_approved boolean default false,
  client_approved_at timestamptz,
  client_feedback text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- CAMPAIGNS (Target kampaniyalar)
-- =============================================
create table public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  name text not null,
  platform text check (platform in ('facebook', 'instagram', 'telegram', 'google', 'tiktok')),
  objective text,
  budget_total numeric(12,2),
  budget_spent numeric(12,2) default 0,
  status text default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  start_date date,
  end_date date,
  impressions integer default 0,
  clicks integer default 0,
  conversions integer default 0,
  ctr numeric(5,2),
  cpc numeric(8,2),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- =============================================
-- MONTHLY REPORTS (Oylik hisobotlar)
-- =============================================
create table public.monthly_reports (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  month date not null,
  posts_planned integer default 0,
  posts_published integer default 0,
  total_reach integer default 0,
  total_engagement integer default 0,
  follower_growth integer default 0,
  stories_count integer default 0,
  reels_count integer default 0,
  ad_spend numeric(12,2) default 0,
  leads_count integer default 0,
  summary text,
  recommendations text,
  is_sent_to_client boolean default false,
  created_at timestamptz default now()
);

-- =============================================
-- SHOOTING SCHEDULES (Syomka jadvali)
-- =============================================
create table public.shooting_schedules (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  location text,
  scheduled_date date not null,
  scheduled_time time,
  duration_hours numeric(4,1),
  assigned_operator uuid references public.profiles(id),
  status text default 'planned' check (status in ('planned', 'confirmed', 'done', 'cancelled', 'rescheduled')),
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- NOTIFICATIONS (Bildirishnomalar)
-- =============================================
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text check (type in ('task', 'approval', 'report', 'system', 'client')),
  is_read boolean default false,
  link text,
  created_at timestamptz default now()
);

-- =============================================
-- CLIENT PORTAL TOKENS (Mijoz kirish tokenlari)
-- =============================================
create table public.client_tokens (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade unique,
  token text not null unique,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- INDEXES (Tezlik uchun)
-- =============================================
create index idx_tasks_client on public.tasks(client_id);
create index idx_tasks_assigned on public.tasks(assigned_to);
create index idx_tasks_stage on public.tasks(stage_id);
create index idx_content_client on public.content_items(client_id);
create index idx_content_status on public.content_items(status);
create index idx_campaigns_client on public.campaigns(client_id);
create index idx_notifications_user on public.notifications(user_id, is_read);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.tasks enable row level security;
alter table public.content_items enable row level security;
alter table public.campaigns enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.notifications enable row level security;

-- Admin/staff: o'z ma'lumotlarini ko'rish
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Staff can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role != 'client')
  );

-- Admin: barcha mijozlarni ko'radi
create policy "Staff see all clients" on public.clients
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role != 'client')
  );

-- Tasklar: barcha staff ko'radi
create policy "Staff see all tasks" on public.tasks
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role != 'client')
  );

-- Kontentlar: barcha staff ko'radi
create policy "Staff see all content" on public.content_items
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role != 'client')
  );

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Task updated_at auto update
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at before update on public.tasks
  for each row execute function update_updated_at();

create trigger clients_updated_at before update on public.clients
  for each row execute function update_updated_at();

create trigger content_updated_at before update on public.content_items
  for each row execute function update_updated_at();

-- Auto notification when task assigned
create or replace function notify_on_task_assign()
returns trigger as $$
begin
  if new.assigned_to is not null and (old.assigned_to is null or old.assigned_to != new.assigned_to) then
    insert into public.notifications (user_id, title, body, type, link)
    values (new.assigned_to, 'Yangi vazifa tayinlandi', new.title, 'task', '/admin/tasks/' || new.id);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger task_assign_notification after insert or update on public.tasks
  for each row execute function notify_on_task_assign();
