-- ============================================================
-- Recipe De-Bloater — Supabase Initial Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text,
  full_name   text,
  avatar_url  text,
  plan        text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Recipes ─────────────────────────────────────────────────────────────────
create table if not exists recipes (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade not null,
  title           text not null,
  description     text,
  ingredients     jsonb not null default '[]',
  instructions    jsonb not null default '[]',
  prep_time       integer,   -- minutes
  cook_time       integer,   -- minutes
  total_time      integer,   -- minutes
  servings        integer,
  cuisine         text,
  difficulty      text check (difficulty in ('Easy', 'Medium', 'Hard')),
  diet            text[],    -- ['Vegetarian', 'Vegan', ...]
  tags            text[],
  image_url       text,
  source_url      text not null,
  source_platform text check (source_platform in ('youtube', 'website', 'other')),
  video_duration  integer,   -- seconds
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Extractions (rate-limit audit log) ──────────────────────────────────────
create table if not exists extractions (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  url        text not null,
  created_at timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

-- Profiles: users can only read/update their own profile
alter table profiles enable row level security;
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Recipes: users can only access their own recipes
alter table recipes enable row level security;
create policy "Users can view own recipes"
  on recipes for select using (auth.uid() = user_id);
create policy "Users can insert own recipes"
  on recipes for insert with check (auth.uid() = user_id);
create policy "Users can delete own recipes"
  on recipes for delete using (auth.uid() = user_id);

-- Extractions: users can only read their own
alter table extractions enable row level security;
create policy "Users can view own extractions"
  on extractions for select using (auth.uid() = user_id);
create policy "Users can insert own extractions"
  on extractions for insert with check (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists recipes_user_id_idx on recipes (user_id);
create index if not exists recipes_created_at_idx on recipes (created_at desc);
create index if not exists recipes_source_url_idx on recipes (source_url);
create index if not exists extractions_user_id_created_at_idx on extractions (user_id, created_at desc);

-- ─── Updated_at trigger ───────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

create trigger update_recipes_updated_at
  before update on recipes
  for each row execute procedure update_updated_at();
