-- Time Crystal: profile + leaderboard schema.
-- Run this once in the Supabase project's SQL editor (Database > SQL Editor > New query).

create table if not exists profiles (
  id text primary key,                 -- 7-digit numeric string, e.g. "0481923"
  nickname text unique not null,
  password_hash text not null,
  avatar_color text not null,          -- hex color for the plain-color-bar avatar
  created_at timestamptz not null default now()
);

create table if not exists best_runs (
  profile_id text not null references profiles(id) on delete cascade,
  level_id int not null,
  time_ms int not null,
  kills int not null default 0,
  secrets int not null default 0,
  completed_at timestamptz not null default now(),
  primary key (profile_id, level_id)
);

create index if not exists best_runs_level_time_idx on best_runs (level_id, time_ms asc);
