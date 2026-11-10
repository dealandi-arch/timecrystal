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

-- Gacha collection (run this once on an existing project too — it is safe to re-run).
-- emerald_shards: currency found hidden in levels. owned_characters: gacha heroes the player has unlocked.
alter table profiles add column if not exists emerald_shards int not null default 0;
alter table profiles add column if not exists owned_characters text[] not null default '{}';

-- Hero levelling (signed-in players; safe to re-run).
-- aizodon: currency earned by finishing levels quickly. character_levels: { heroId: level }.
-- aizodon_claimed_at: when the last run reward was paid, used to reject forged rapid claims.
alter table profiles add column if not exists aizodon int not null default 0;
alter table profiles add column if not exists character_levels jsonb not null default '{}';
alter table profiles add column if not exists aizodon_claimed_at timestamptz;

-- Avatars and richer profiles (safe to re-run).
-- avatar_pixels: 1024 characters for a 32x32 pixel avatar (null = show the player's initial).
-- last_seen_at: when they were last online. recent_characters: heroes they picked most recently.
alter table profiles add column if not exists avatar_pixels text;
alter table profiles add column if not exists last_seen_at timestamptz;
alter table profiles add column if not exists recent_characters text[] not null default '{}';

-- Skills bought with Aizodon (safe to re-run). { "owned": [skillId], "equipped": { heroId: skillId } }
alter table profiles add column if not exists skills jsonb not null default '{}';

-- Public levels made in the level builder (safe to re-run).
-- data: { rows, dark, start, enemies, crystalPath } in the same text format as the built-in 3D maps.
create table if not exists custom_levels (
  id bigserial primary key,
  author_id text not null references profiles(id) on delete cascade,
  name text not null,
  mode text not null check (mode in ('2d', '3d')),
  data jsonb not null,
  plays int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists custom_levels_created_idx on custom_levels (created_at desc);
create index if not exists custom_levels_author_idx on custom_levels (author_id);
