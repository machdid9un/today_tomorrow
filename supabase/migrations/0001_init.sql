-- 초기 스키마 (README §9). 소유: 역할 1.
-- TODO(역할 1): RLS 정책, 인덱스, 트리거 추가.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  parent_pin_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.users (id) on delete cascade,
  guest_token_hash text,
  guest_expires_at timestamptz,
  child_name text,
  child_age int,
  memory_json jsonb not null default '{}'::jsonb,
  next_seed_preset text,
  next_seed_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  episode_number int not null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  title text,
  island_title text,
  storybook_text text,
  report_json jsonb,
  next_teaser text,
  share_token_hash text,
  share_include_quote boolean not null default false
);

create table if not exists public.turns (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes (id) on delete cascade,
  turn_index int not null,
  child_text text,
  narration text,
  choices_json jsonb,
  latency_ms int,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist (
  email text primary key,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

-- TODO(역할 1): alter table ... enable row level security; + policy 정의.
