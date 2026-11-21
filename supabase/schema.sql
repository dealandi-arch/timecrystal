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

-- Update 10: public level verification (safe to re-run).
-- A new public level stays hidden until its creator beats it once; verified_at is when they did,
-- verify_time_ms their clear time. Each verified level also gets its own World's Best list in best_runs
-- (level_id = 100000 + the level's id).
alter table custom_levels add column if not exists verified_at timestamptz;
alter table custom_levels add column if not exists verify_time_ms int;
create index if not exists custom_levels_verified_idx on custom_levels (verified_at);

-- Update 10: display names (safe to re-run). nickname stays the permanent username used to log in;
-- display_name is what everyone sees (null = show the username). It can change once every 5 days.
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists display_name_changed_at timestamptz;

-- Update 10.5.0 (safe to re-run).
-- notifications: messages shown to a player next time they open the site (e.g. a warning for a rejected run).
create table if not exists notifications (
  id bigserial primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_unread_idx on notifications (profile_id, read_at);
-- hero_cards: card gacha progress, { heroId: cards collected }.
alter table public.profiles add column if not exists hero_cards jsonb not null default '{}';
-- craze_scores: best Multienemy Craze score per player and round length (minutes).
create table if not exists craze_scores (
  profile_id text not null references public.profiles(id) on delete cascade,
  minutes int not null,
  kills int not null,
  duration_ms int not null,
  achieved_at timestamptz not null default now(),
  primary key (profile_id, minutes)
);
create index if not exists craze_scores_rank_idx on craze_scores (minutes, kills desc);

-- Admins and chat (safe to re-run).
-- is_admin: can use /admin (fix records, warn players, make admins) and the Admin chat.
alter table public.profiles add column if not exists is_admin boolean not null default false;
create table if not exists admin_log (
  id bigserial primary key,
  admin_id text not null references public.profiles(id) on delete cascade,
  target_id text,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_target_idx on admin_log (target_id, created_at desc);
-- chat_messages: the World chat (everyone) and the Admin chat (admins only).
create table if not exists chat_messages (
  id bigserial primary key,
  channel text not null check (channel in ('world', 'admin')),
  profile_id text not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists chat_messages_channel_idx on chat_messages (channel, id desc);
create index if not exists chat_messages_author_idx on chat_messages (profile_id, created_at desc);

-- Cheat catcher (safe to re-run).
-- cheat_reports: runs the catcher refused ('open') or records that look suspicious ('review'), with the replay
-- so admins can watch how it was done; admins mark them 'confirmed' or 'cleared'.
create table if not exists cheat_reports (
  id bigserial primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  level_id int not null,
  level_name text not null,
  time_ms int not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'review', 'confirmed', 'cleared')),
  replay jsonb,
  level_snapshot jsonb,
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz
);
create index if not exists cheat_reports_status_idx on cheat_reports (status, created_at desc);
create index if not exists cheat_reports_player_idx on cheat_reports (profile_id, level_id, created_at desc);
-- run_replays: the replay of each player's best run on each level, so any record can be watched.
create table if not exists run_replays (
  profile_id text not null references public.profiles(id) on delete cascade,
  level_id int not null,
  time_ms int not null,
  replay jsonb,
  created_at timestamptz not null default now(),
  primary key (profile_id, level_id)
);

-- Email linking, tryouts on the profile, daily rewards, trading (safe to re-run).
-- email: optional and private (only the player sees it). trials: { heroId: ends at } (admins can give tryouts).
-- daily: { day, spun, progress, claimed } for the daily wheel and quests.
alter table public.profiles add column if not exists email text;
create unique index if not exists profiles_email_idx on public.profiles (lower(email)) where email is not null;
alter table public.profiles add column if not exists trials jsonb not null default '{}';
alter table public.profiles add column if not exists daily jsonb not null default '{}';
-- trades: an offer of shards and hero cards for shards and hero cards.
create table if not exists trades (
  id bigserial primary key,
  from_id text not null references public.profiles(id) on delete cascade,
  to_id text not null references public.profiles(id) on delete cascade,
  give jsonb not null default '{}',
  want jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists trades_to_idx on trades (to_id, status);
create index if not exists trades_from_idx on trades (from_id, status);
-- accept_trade: checks both players still have what they're trading and swaps it all in one go.
create or replace function accept_trade(p_trade bigint, p_by text) returns text
language plpgsql as $$
declare
  t trades%rowtype;
  a public.profiles%rowtype;
  b public.profiles%rowtype;
  k text;
  v int;
  gs int;
  ws int;
begin
  select * into t from trades where id = p_trade for update;
  if not found then return 'That trade doesn''t exist.'; end if;
  if t.status <> 'pending' then return 'That trade is already finished.'; end if;
  if t.to_id <> p_by then return 'This offer isn''t for you.'; end if;
  select * into a from public.profiles where id = t.from_id for update;
  select * into b from public.profiles where id = t.to_id for update;
  gs := coalesce((t.give->>'shards')::int, 0);
  ws := coalesce((t.want->>'shards')::int, 0);
  if a.emerald_shards < gs then return 'They don''t have the shards they offered any more.'; end if;
  if b.emerald_shards < ws then return 'You don''t have enough Emerald Shards.'; end if;
  for k, v in select key, value::int from jsonb_each_text(coalesce(t.give->'cards', '{}')) loop
    if k = any(a.owned_characters) then return 'They own that hero now, so those cards can''t be traded.'; end if;
    if coalesce((a.hero_cards->>k)::int, 0) < v then return 'They don''t have those cards any more.'; end if;
  end loop;
  for k, v in select key, value::int from jsonb_each_text(coalesce(t.want->'cards', '{}')) loop
    if k = any(b.owned_characters) then return 'You own that hero, so those cards can''t be traded.'; end if;
    if coalesce((b.hero_cards->>k)::int, 0) < v then return 'You don''t have those cards.'; end if;
  end loop;
  for k, v in select key, value::int from jsonb_each_text(coalesce(t.give->'cards', '{}')) loop
    a.hero_cards := jsonb_set(a.hero_cards, array[k], to_jsonb(coalesce((a.hero_cards->>k)::int, 0) - v));
    b.hero_cards := jsonb_set(b.hero_cards, array[k], to_jsonb(coalesce((b.hero_cards->>k)::int, 0) + v));
  end loop;
  for k, v in select key, value::int from jsonb_each_text(coalesce(t.want->'cards', '{}')) loop
    b.hero_cards := jsonb_set(b.hero_cards, array[k], to_jsonb(coalesce((b.hero_cards->>k)::int, 0) - v));
    a.hero_cards := jsonb_set(a.hero_cards, array[k], to_jsonb(coalesce((a.hero_cards->>k)::int, 0) + v));
  end loop;
  update public.profiles set emerald_shards = a.emerald_shards - gs + ws, hero_cards = a.hero_cards where id = a.id;
  update public.profiles set emerald_shards = b.emerald_shards - ws + gs, hero_cards = b.hero_cards where id = b.id;
  update trades set status = 'accepted', decided_at = now() where id = t.id;
  return 'ok';
end;
$$;

-- PvP races (safe to re-run).
-- pvp_rating: Elo-style rating (start 1000). pvp_matches: a race against a ghost (a recorded run) or a live player.
alter table public.profiles add column if not exists pvp_rating int not null default 1000;
alter table public.profiles add column if not exists pvp_wins int not null default 0;
alter table public.profiles add column if not exists pvp_losses int not null default 0;
create table if not exists pvp_matches (
  id bigserial primary key,
  mode text not null check (mode in ('ghost', 'live')),
  level_id int not null,
  a_id text not null references public.profiles(id) on delete cascade,
  b_id text references public.profiles(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'done', 'cancelled')),
  start_at timestamptz,
  a_pos jsonb,
  b_pos jsonb,
  a_time_ms int,
  b_time_ms int,
  winner_id text,
  a_change int,
  b_change int,
  reward int not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists pvp_matches_waiting_idx on pvp_matches (status, mode, created_at);
create index if not exists pvp_matches_player_idx on pvp_matches (a_id, mode, finished_at desc);
create index if not exists profiles_pvp_rating_idx on public.profiles (pvp_rating desc);

-- PvP arena fights and challenges (safe to re-run).
-- kind: a live match is either a 'race' or an 'arena' fight (arena rows use level_id 0).
-- invite: a challenge sent to one player (b_id is set from the start), not a queue match.
alter table pvp_matches add column if not exists kind text not null default 'race';
alter table pvp_matches add column if not exists invite boolean not null default false;
do $$ begin
  alter table pvp_matches add constraint pvp_matches_kind_check check (kind in ('race', 'arena'));
exception when duplicate_object then null; end $$;
create index if not exists pvp_matches_invite_idx on pvp_matches (b_id, status) where invite;

-- Admin tiers (safe to re-run). 11 admin spots: 1 godly (lavatatorr), 1 co, 3 ultra, 4 super, 2 admin.
alter table public.profiles add column if not exists admin_tier text;
do $$ begin
  alter table public.profiles add constraint profiles_admin_tier_check check (admin_tier is null or admin_tier in ('admin', 'super', 'ultra', 'co', 'godly'));
exception when duplicate_object then null; end $$;
update public.profiles set admin_tier = 'admin' where is_admin = true and admin_tier is null;
update public.profiles set is_admin = true, admin_tier = 'godly' where lower(nickname) = 'lavatatorr';
