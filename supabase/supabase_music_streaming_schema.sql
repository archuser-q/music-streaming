-- ============================================================================
-- MUSIC STREAMING DATABASE FOR SUPABASE
-- Stack: Supabase Auth + PostgreSQL + Storage + ReactJS
-- Run once in: Supabase Dashboard -> SQL Editor
-- ============================================================================

begin;

-- ============================================================================
-- 1. EXTENSIONS, SCHEMAS, ENUMS
-- ============================================================================

create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

do $$
begin
  create type public.app_role as enum ('admin', 'user');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.song_status as enum ('draft', 'pending', 'published', 'rejected');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.song_source as enum ('admin_upload', 'user_upload');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.playlist_visibility as enum ('private', 'public');
exception
  when duplicate_object then null;
end
$$;

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  avatar_path text,
  bio text,
  role public.app_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 40)
);

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists genres_name_lower_uidx
  on public.genres (lower(name));
create unique index if not exists genres_slug_lower_uidx
  on public.genres (lower(slug));

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  biography text,
  image_path text,
  country text,
  created_by uuid references public.profiles(id) on delete set null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists artists_slug_lower_uidx
  on public.artists (lower(slug));
create index if not exists artists_name_trgm_idx
  on public.artists using gin (name extensions.gin_trgm_ops);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  cover_path text,
  release_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists albums_slug_lower_uidx
  on public.albums (lower(slug));
create index if not exists albums_artist_id_idx on public.albums (artist_id);
create index if not exists albums_title_trgm_idx
  on public.albums using gin (title extensions.gin_trgm_ops);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  artist_id uuid references public.artists(id) on delete set null,
  album_id uuid references public.albums(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  source public.song_source not null default 'admin_upload',
  status public.song_status not null default 'draft',
  audio_path text not null,
  cover_path text,
  duration_seconds integer not null,
  track_number integer,
  release_date date,
  lyrics_language text,
  is_explicit boolean not null default false,
  total_plays bigint not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint songs_duration_positive check (duration_seconds > 0),
  constraint songs_track_number_positive check (track_number is null or track_number > 0),
  constraint songs_total_plays_nonnegative check (total_plays >= 0)
);

create unique index if not exists songs_slug_lower_uidx
  on public.songs (lower(slug));
create unique index if not exists songs_audio_path_uidx
  on public.songs (audio_path);
create index if not exists songs_artist_id_idx on public.songs (artist_id);
create index if not exists songs_album_id_idx on public.songs (album_id);
create index if not exists songs_uploaded_by_idx on public.songs (uploaded_by);
create index if not exists songs_status_idx on public.songs (status);
create index if not exists songs_total_plays_idx on public.songs (total_plays desc);
create index if not exists songs_title_trgm_idx
  on public.songs using gin (title extensions.gin_trgm_ops);

create table if not exists public.song_genres (
  song_id uuid not null references public.songs(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (song_id, genre_id)
);

create index if not exists song_genres_genre_id_idx
  on public.song_genres (genre_id, song_id);

create table if not exists public.lyrics_lines (
  id bigint generated always as identity primary key,
  song_id uuid not null references public.songs(id) on delete cascade,
  line_order integer not null,
  start_ms integer not null,
  end_ms integer,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lyrics_line_order_nonnegative check (line_order >= 0),
  constraint lyrics_start_nonnegative check (start_ms >= 0),
  constraint lyrics_end_after_start check (end_ms is null or end_ms > start_ms),
  unique (song_id, line_order),
  unique (song_id, start_ms)
);

create index if not exists lyrics_lines_song_time_idx
  on public.lyrics_lines (song_id, start_ms);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cover_path text,
  visibility public.playlist_visibility not null default 'private',
  share_enabled boolean not null default false,
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playlists_title_length check (char_length(title) between 1 and 120),
  unique (share_token)
);

create index if not exists playlists_owner_id_idx on public.playlists (owner_id);
create index if not exists playlists_visibility_idx on public.playlists (visibility);

create table if not exists public.playlist_songs (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (playlist_id, song_id),
  unique (playlist_id, position),
  constraint playlist_song_position_positive check (position > 0)
);

create index if not exists playlist_songs_song_id_idx
  on public.playlist_songs (song_id);

create table if not exists public.liked_songs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  liked_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index if not exists liked_songs_song_id_idx
  on public.liked_songs (song_id);

create table if not exists public.song_plays (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  session_id uuid not null,
  listened_seconds integer not null default 0,
  completed boolean not null default false,
  played_at timestamptz not null default now(),
  constraint song_plays_listened_nonnegative check (listened_seconds >= 0),
  unique (user_id, session_id)
);

create index if not exists song_plays_song_played_at_idx
  on public.song_plays (song_id, played_at desc);
create index if not exists song_plays_user_played_at_idx
  on public.song_plays (user_id, played_at desc);
create index if not exists song_plays_played_at_idx
  on public.song_plays (played_at desc);

-- ============================================================================
-- 3. HELPER FUNCTIONS AND TRIGGERS
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.app_role
      and p.is_active = true
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

create or replace function private.slugify(input_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

revoke all on function private.slugify(text) from public, anon, authenticated;

create or replace function private.ensure_unique_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  suffix text;
  duplicate_exists boolean;
begin
  if new.slug is null or btrim(new.slug) = '' then
    base_slug := private.slugify(
      case tg_table_name
        when 'artists' then to_jsonb(new) ->> 'name'
        else to_jsonb(new) ->> 'title'
      end
    );
  else
    base_slug := private.slugify(new.slug);
  end if;

  if base_slug = '' then
    base_slug := tg_table_name;
  end if;

  candidate := base_slug;
  suffix := left(new.id::text, 8);

  execute format(
    'select exists(select 1 from public.%I where lower(slug) = lower($1) and id <> $2)',
    tg_table_name
  )
  into duplicate_exists
  using candidate, new.id;

  if duplicate_exists then
    candidate := base_slug || '-' || suffix;
  end if;

  new.slug := candidate;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := lower(
    regexp_replace(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'username', ''),
        nullif(new.raw_user_meta_data ->> 'name', ''),
        split_part(coalesce(new.email, 'user'), '@', 1),
        'user'
      ),
      '[^a-zA-Z0-9_]+',
      '',
      'g'
    )
  );

  if char_length(base_username) < 3 then
    base_username := 'user';
  end if;

  final_username := left(base_username, 31) || '_' || left(new.id::text, 8);

  insert into public.profiles (
    id,
    username,
    display_name,
    role,
    is_active
  )
  values (
    new.id,
    final_username,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, final_username), '@', 1)
    ),
    'user'::public.app_role,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function private.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;

  if (select auth.uid()) is not null and not private.is_admin() then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;

  return new;
end;
$$;

create or replace function private.enforce_song_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_user uuid := (select auth.uid());
  internal_play_update boolean := coalesce(
    current_setting('app.internal_play_update', true),
    '0'
  ) = '1';
  trusted_write boolean := (
    (select auth.uid()) is null
    or private.is_admin()
    or internal_play_update
  );
begin
  if tg_op = 'INSERT' then
    if trusted_write then
      if new.uploaded_by is null then
        new.uploaded_by := jwt_user;
      end if;

      if new.status = 'published'::public.song_status and new.published_at is null then
        new.published_at := now();
      end if;
    else
      new.uploaded_by := jwt_user;
      new.source := 'user_upload'::public.song_source;
      new.status := 'pending'::public.song_status;
      new.total_plays := 0;
      new.published_at := null;
    end if;
  else
    new.created_at := old.created_at;
    new.total_plays := old.total_plays;

    if trusted_write then
      if new.status = 'published'::public.song_status
         and old.status <> 'published'::public.song_status
         and new.published_at is null then
        new.published_at := now();
      elsif new.status <> 'published'::public.song_status then
        new.published_at := null;
      end if;
    else
      new.uploaded_by := old.uploaded_by;
      new.source := old.source;
      new.status := old.status;
      new.published_at := old.published_at;
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.validate_song_album_artist()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  album_artist uuid;
begin
  if new.album_id is null then
    return new;
  end if;

  select a.artist_id
    into album_artist
  from public.albums a
  where a.id = new.album_id;

  if album_artist is null then
    raise exception 'Album does not exist';
  end if;

  if new.artist_id is null then
    new.artist_id := album_artist;
  elsif new.artist_id <> album_artist then
    raise exception 'Song artist must match album artist';
  end if;

  return new;
end;
$$;

create or replace function private.assign_playlist_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.position is null or new.position <= 0 then
    select coalesce(max(ps.position), 0) + 1
      into new.position
    from public.playlist_songs ps
    where ps.playlist_id = new.playlist_id;
  end if;

  if new.added_by is null then
    new.added_by := (select auth.uid());
  end if;

  return new;
end;
$$;

create or replace function private.increment_song_play_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.internal_play_update', '1', true);

  update public.songs
  set total_plays = total_plays + 1
  where id = new.song_id;

  perform set_config('app.internal_play_update', '0', true);
  return new;
end;
$$;

create or replace function private.decrement_song_play_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.internal_play_update', '1', true);

  update public.songs
  set total_plays = greatest(total_plays - 1, 0)
  where id = old.song_id;

  perform set_config('app.internal_play_update', '0', true);
  return old;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_protect_fields on public.profiles;
create trigger trg_profiles_protect_fields
before update on public.profiles
for each row execute function private.protect_profile_fields();

drop trigger if exists on_auth_user_created_music_app on auth.users;
create trigger on_auth_user_created_music_app
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists trg_genres_updated_at on public.genres;
create trigger trg_genres_updated_at
before update on public.genres
for each row execute function public.set_updated_at();

drop trigger if exists trg_artists_updated_at on public.artists;
create trigger trg_artists_updated_at
before update on public.artists
for each row execute function public.set_updated_at();

drop trigger if exists trg_artists_slug on public.artists;
create trigger trg_artists_slug
before insert or update of name, slug on public.artists
for each row execute function private.ensure_unique_slug();

drop trigger if exists trg_albums_updated_at on public.albums;
create trigger trg_albums_updated_at
before update on public.albums
for each row execute function public.set_updated_at();

drop trigger if exists trg_albums_slug on public.albums;
create trigger trg_albums_slug
before insert or update of title, slug on public.albums
for each row execute function private.ensure_unique_slug();

drop trigger if exists trg_songs_updated_at on public.songs;
create trigger trg_songs_updated_at
before update on public.songs
for each row execute function public.set_updated_at();

drop trigger if exists trg_songs_slug on public.songs;
create trigger trg_songs_slug
before insert or update of title, slug on public.songs
for each row execute function private.ensure_unique_slug();

drop trigger if exists trg_songs_rules on public.songs;
create trigger trg_songs_rules
before insert or update on public.songs
for each row execute function private.enforce_song_rules();

drop trigger if exists trg_songs_album_artist on public.songs;
create trigger trg_songs_album_artist
before insert or update of artist_id, album_id on public.songs
for each row execute function private.validate_song_album_artist();

drop trigger if exists trg_lyrics_updated_at on public.lyrics_lines;
create trigger trg_lyrics_updated_at
before update on public.lyrics_lines
for each row execute function public.set_updated_at();

drop trigger if exists trg_playlists_updated_at on public.playlists;
create trigger trg_playlists_updated_at
before update on public.playlists
for each row execute function public.set_updated_at();

drop trigger if exists trg_playlist_song_position on public.playlist_songs;
create trigger trg_playlist_song_position
before insert on public.playlist_songs
for each row execute function private.assign_playlist_position();

drop trigger if exists trg_song_play_increment on public.song_plays;
create trigger trg_song_play_increment
after insert on public.song_plays
for each row execute function private.increment_song_play_count();

drop trigger if exists trg_song_play_decrement on public.song_plays;
create trigger trg_song_play_decrement
after delete on public.song_plays
for each row execute function private.decrement_song_play_count();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.genres enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.songs enable row level security;
alter table public.song_genres enable row level security;
alter table public.lyrics_lines enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.liked_songs enable row level security;
alter table public.song_plays enable row level security;

-- Profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or private.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()) or private.is_admin())
with check (id = (select auth.uid()) or private.is_admin());

-- Genres
drop policy if exists "genres_public_read" on public.genres;
create policy "genres_public_read"
on public.genres
for select
to anon, authenticated
using (true);

drop policy if exists "genres_admin_manage" on public.genres;
create policy "genres_admin_manage"
on public.genres
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

-- Artists
drop policy if exists "artists_public_read" on public.artists;
create policy "artists_public_read"
on public.artists
for select
to anon, authenticated
using (true);

drop policy if exists "artists_admin_manage" on public.artists;
create policy "artists_admin_manage"
on public.artists
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

-- Albums
drop policy if exists "albums_public_read" on public.albums;
create policy "albums_public_read"
on public.albums
for select
to anon, authenticated
using (true);

drop policy if exists "albums_admin_manage" on public.albums;
create policy "albums_admin_manage"
on public.albums
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

-- Songs
drop policy if exists "songs_read_visible" on public.songs;
create policy "songs_read_visible"
on public.songs
for select
to anon, authenticated
using (
  status = 'published'::public.song_status
  or uploaded_by = (select auth.uid())
  or private.is_admin()
);

drop policy if exists "songs_insert_admin_or_owner" on public.songs;
create policy "songs_insert_admin_or_owner"
on public.songs
for insert
to authenticated
with check (
  private.is_admin()
  or uploaded_by = (select auth.uid())
);

drop policy if exists "songs_update_admin_or_unpublished_owner" on public.songs;
create policy "songs_update_admin_or_unpublished_owner"
on public.songs
for update
to authenticated
using (
  private.is_admin()
  or (
    uploaded_by = (select auth.uid())
    and status <> 'published'::public.song_status
  )
)
with check (
  private.is_admin()
  or uploaded_by = (select auth.uid())
);

drop policy if exists "songs_delete_admin_or_unpublished_owner" on public.songs;
create policy "songs_delete_admin_or_unpublished_owner"
on public.songs
for delete
to authenticated
using (
  private.is_admin()
  or (
    uploaded_by = (select auth.uid())
    and status <> 'published'::public.song_status
  )
);

-- Song genres
drop policy if exists "song_genres_read_visible_song" on public.song_genres;
create policy "song_genres_read_visible_song"
on public.song_genres
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.songs s
    where s.id = song_genres.song_id
      and (
        s.status = 'published'::public.song_status
        or s.uploaded_by = (select auth.uid())
        or private.is_admin()
      )
  )
);

drop policy if exists "song_genres_insert_admin_or_song_owner" on public.song_genres;
create policy "song_genres_insert_admin_or_song_owner"
on public.song_genres
for insert
to authenticated
with check (
  private.is_admin()
  or exists (
    select 1
    from public.songs s
    where s.id = song_genres.song_id
      and s.uploaded_by = (select auth.uid())
      and s.status <> 'published'::public.song_status
  )
);

drop policy if exists "song_genres_delete_admin_or_song_owner" on public.song_genres;
create policy "song_genres_delete_admin_or_song_owner"
on public.song_genres
for delete
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.songs s
    where s.id = song_genres.song_id
      and s.uploaded_by = (select auth.uid())
      and s.status <> 'published'::public.song_status
  )
);

-- Lyrics
drop policy if exists "lyrics_read_visible_song" on public.lyrics_lines;
create policy "lyrics_read_visible_song"
on public.lyrics_lines
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.songs s
    where s.id = lyrics_lines.song_id
      and (
        s.status = 'published'::public.song_status
        or s.uploaded_by = (select auth.uid())
        or private.is_admin()
      )
  )
);

drop policy if exists "lyrics_insert_admin_or_song_owner" on public.lyrics_lines;
create policy "lyrics_insert_admin_or_song_owner"
on public.lyrics_lines
for insert
to authenticated
with check (
  private.is_admin()
  or exists (
    select 1
    from public.songs s
    where s.id = lyrics_lines.song_id
      and s.uploaded_by = (select auth.uid())
      and s.status <> 'published'::public.song_status
  )
);

drop policy if exists "lyrics_update_admin_or_song_owner" on public.lyrics_lines;
create policy "lyrics_update_admin_or_song_owner"
on public.lyrics_lines
for update
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.songs s
    where s.id = lyrics_lines.song_id
      and s.uploaded_by = (select auth.uid())
      and s.status <> 'published'::public.song_status
  )
)
with check (
  private.is_admin()
  or exists (
    select 1
    from public.songs s
    where s.id = lyrics_lines.song_id
      and s.uploaded_by = (select auth.uid())
      and s.status <> 'published'::public.song_status
  )
);

drop policy if exists "lyrics_delete_admin_or_song_owner" on public.lyrics_lines;
create policy "lyrics_delete_admin_or_song_owner"
on public.lyrics_lines
for delete
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.songs s
    where s.id = lyrics_lines.song_id
      and s.uploaded_by = (select auth.uid())
      and s.status <> 'published'::public.song_status
  )
);

-- Playlists
drop policy if exists "playlists_read_public_or_owner" on public.playlists;
create policy "playlists_read_public_or_owner"
on public.playlists
for select
to anon, authenticated
using (
  visibility = 'public'::public.playlist_visibility
  or owner_id = (select auth.uid())
  or private.is_admin()
);

drop policy if exists "playlists_insert_owner" on public.playlists;
create policy "playlists_insert_owner"
on public.playlists
for insert
to authenticated
with check (owner_id = (select auth.uid()) or private.is_admin());

drop policy if exists "playlists_update_owner" on public.playlists;
create policy "playlists_update_owner"
on public.playlists
for update
to authenticated
using (owner_id = (select auth.uid()) or private.is_admin())
with check (owner_id = (select auth.uid()) or private.is_admin());

drop policy if exists "playlists_delete_owner" on public.playlists;
create policy "playlists_delete_owner"
on public.playlists
for delete
to authenticated
using (owner_id = (select auth.uid()) or private.is_admin());

-- Playlist songs
drop policy if exists "playlist_songs_read_accessible_playlist" on public.playlist_songs;
create policy "playlist_songs_read_accessible_playlist"
on public.playlist_songs
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_songs.playlist_id
      and (
        p.visibility = 'public'::public.playlist_visibility
        or p.owner_id = (select auth.uid())
        or private.is_admin()
      )
  )
);

drop policy if exists "playlist_songs_insert_owner" on public.playlist_songs;
create policy "playlist_songs_insert_owner"
on public.playlist_songs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_songs.playlist_id
      and (p.owner_id = (select auth.uid()) or private.is_admin())
  )
);

drop policy if exists "playlist_songs_update_owner" on public.playlist_songs;
create policy "playlist_songs_update_owner"
on public.playlist_songs
for update
to authenticated
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_songs.playlist_id
      and (p.owner_id = (select auth.uid()) or private.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_songs.playlist_id
      and (p.owner_id = (select auth.uid()) or private.is_admin())
  )
);

drop policy if exists "playlist_songs_delete_owner" on public.playlist_songs;
create policy "playlist_songs_delete_owner"
on public.playlist_songs
for delete
to authenticated
using (
  exists (
    select 1
    from public.playlists p
    where p.id = playlist_songs.playlist_id
      and (p.owner_id = (select auth.uid()) or private.is_admin())
  )
);

-- Liked songs
drop policy if exists "liked_songs_read_own" on public.liked_songs;
create policy "liked_songs_read_own"
on public.liked_songs
for select
to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

drop policy if exists "liked_songs_insert_own" on public.liked_songs;
create policy "liked_songs_insert_own"
on public.liked_songs
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "liked_songs_delete_own" on public.liked_songs;
create policy "liked_songs_delete_own"
on public.liked_songs
for delete
to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

-- Song play history: direct inserts are intentionally disabled.
drop policy if exists "song_plays_read_own_or_admin" on public.song_plays;
create policy "song_plays_read_own_or_admin"
on public.song_plays
for select
to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

drop policy if exists "song_plays_admin_delete" on public.song_plays;
create policy "song_plays_admin_delete"
on public.song_plays
for delete
to authenticated
using (private.is_admin());

-- ============================================================================
-- 5. VIEWS FOR REACT QUERIES
-- ============================================================================

create or replace view public.song_catalog
with (security_invoker = true)
as
select
  s.id,
  s.title,
  s.slug,
  s.artist_id,
  ar.name as artist_name,
  ar.slug as artist_slug,
  s.album_id,
  al.title as album_title,
  al.slug as album_slug,
  s.audio_path,
  coalesce(s.cover_path, al.cover_path, ar.image_path) as cover_path,
  s.duration_seconds,
  s.track_number,
  s.release_date,
  s.is_explicit,
  s.total_plays,
  s.status,
  s.uploaded_by,
  coalesce(
    jsonb_agg(
      distinct jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'slug', g.slug
      )
    ) filter (where g.id is not null),
    '[]'::jsonb
  ) as genres
from public.songs s
left join public.artists ar on ar.id = s.artist_id
left join public.albums al on al.id = s.album_id
left join public.song_genres sg on sg.song_id = s.id
left join public.genres g on g.id = sg.genre_id
group by
  s.id,
  ar.name,
  ar.slug,
  al.title,
  al.slug,
  al.cover_path,
  ar.image_path;

create or replace view public.artist_catalog
with (security_invoker = true)
as
select
  ar.id,
  ar.name,
  ar.slug,
  ar.biography,
  ar.image_path,
  ar.country,
  ar.is_verified,
  count(distinct s.id) filter (
    where s.status = 'published'::public.song_status
  ) as song_count,
  count(distinct al.id) as album_count,
  coalesce(sum(s.total_plays) filter (
    where s.status = 'published'::public.song_status
  ), 0) as total_plays
from public.artists ar
left join public.albums al on al.artist_id = ar.id
left join public.songs s on s.artist_id = ar.id
group by ar.id;

-- ============================================================================
-- 6. RPC FUNCTIONS
-- ============================================================================

-- Record a valid play after at least 30 seconds or 50% of a short song.
create or replace function public.record_song_play(
  p_song_id uuid,
  p_session_id uuid,
  p_listened_seconds integer,
  p_completed boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  song_duration integer;
  required_seconds integer;
  inserted_rows integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select s.duration_seconds
    into song_duration
  from public.songs s
  where s.id = p_song_id
    and (
      s.status = 'published'::public.song_status
      or s.uploaded_by = current_user_id
      or private.is_admin()
    );

  if song_duration is null then
    raise exception 'Song not found or inaccessible';
  end if;

  required_seconds := least(30, greatest(1, ceil(song_duration * 0.5)::integer));

  if not coalesce(p_completed, false)
     and greatest(coalesce(p_listened_seconds, 0), 0) < required_seconds then
    return false;
  end if;

  -- Basic anti-spam protection.
  if exists (
    select 1
    from public.song_plays sp
    where sp.user_id = current_user_id
      and sp.song_id = p_song_id
      and sp.played_at > now() - interval '20 seconds'
  ) then
    return false;
  end if;

  insert into public.song_plays (
    user_id,
    song_id,
    session_id,
    listened_seconds,
    completed
  )
  values (
    current_user_id,
    p_song_id,
    p_session_id,
    least(greatest(coalesce(p_listened_seconds, 0), 0), song_duration),
    coalesce(p_completed, false)
  )
  on conflict (user_id, session_id) do nothing;

  get diagnostics inserted_rows = row_count;
  return inserted_rows = 1;
end;
$$;

-- Search songs, artists, and albums from one endpoint.
create or replace function public.search_catalog(
  p_query text,
  p_limit integer default 20
)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  image_path text,
  rank_score integer
)
language sql
stable
set search_path = ''
as $$
  with normalized as (
    select lower(trim(coalesce(p_query, ''))) as q,
           least(greatest(coalesce(p_limit, 20), 1), 100) as lim
  ),
  results as (
    select
      'song'::text as entity_type,
      s.id as entity_id,
      s.title,
      coalesce(ar.name, 'Independent upload') as subtitle,
      coalesce(s.cover_path, al.cover_path, ar.image_path) as image_path,
      case
        when lower(s.title) = n.q then 100
        when lower(s.title) like n.q || '%' then 80
        when lower(s.title) like '%' || n.q || '%' then 60
        else 0
      end as rank_score
    from public.songs s
    left join public.artists ar on ar.id = s.artist_id
    left join public.albums al on al.id = s.album_id
    cross join normalized n
    where n.q <> ''
      and lower(s.title) like '%' || n.q || '%'

    union all

    select
      'artist'::text,
      ar.id,
      ar.name,
      coalesce(ar.country, 'Artist'),
      ar.image_path,
      case
        when lower(ar.name) = n.q then 100
        when lower(ar.name) like n.q || '%' then 80
        when lower(ar.name) like '%' || n.q || '%' then 60
        else 0
      end
    from public.artists ar
    cross join normalized n
    where n.q <> ''
      and lower(ar.name) like '%' || n.q || '%'

    union all

    select
      'album'::text,
      al.id,
      al.title,
      coalesce(ar.name, 'Album'),
      al.cover_path,
      case
        when lower(al.title) = n.q then 100
        when lower(al.title) like n.q || '%' then 80
        when lower(al.title) like '%' || n.q || '%' then 60
        else 0
      end
    from public.albums al
    join public.artists ar on ar.id = al.artist_id
    cross join normalized n
    where n.q <> ''
      and lower(al.title) like '%' || n.q || '%'
  )
  select r.entity_type, r.entity_id, r.title, r.subtitle, r.image_path, r.rank_score
  from results r
  order by r.rank_score desc, r.title
  limit (select lim from normalized);
$$;

-- Personalized recommendation based on recently played artists and genres.
create or replace function public.recommend_songs(
  p_limit integer default 20
)
returns table (
  song_id uuid,
  title text,
  artist_name text,
  album_title text,
  cover_path text,
  duration_seconds integer,
  score numeric
)
language sql
stable
set search_path = ''
as $$
  with settings as (
    select (select auth.uid()) as uid,
           least(greatest(coalesce(p_limit, 20), 1), 100) as lim
  ),
  recent_plays as (
    select sp.song_id
    from public.song_plays sp, settings st
    where sp.user_id = st.uid
    order by sp.played_at desc
    limit 100
  ),
  artist_weights as (
    select s.artist_id, count(*)::numeric as weight
    from recent_plays rp
    join public.songs s on s.id = rp.song_id
    where s.artist_id is not null
    group by s.artist_id
  ),
  genre_weights as (
    select sg.genre_id, count(*)::numeric as weight
    from recent_plays rp
    join public.song_genres sg on sg.song_id = rp.song_id
    group by sg.genre_id
  ),
  recently_heard as (
    select distinct sp.song_id
    from public.song_plays sp, settings st
    where sp.user_id = st.uid
      and sp.played_at > now() - interval '30 days'
  ),
  candidate_scores as (
    select
      s.id,
      (
        ln(1 + s.total_plays)::numeric
        + coalesce(max(aw.weight), 0) * 2
        + coalesce(sum(gw.weight), 0)
        + case when ls.song_id is not null then 3 else 0 end
      ) as score
    from public.songs s
    left join artist_weights aw on aw.artist_id = s.artist_id
    left join public.song_genres sg on sg.song_id = s.id
    left join genre_weights gw on gw.genre_id = sg.genre_id
    left join public.liked_songs ls
      on ls.song_id = s.id
     and ls.user_id = (select uid from settings)
    where s.status = 'published'::public.song_status
      and not exists (
        select 1 from recently_heard rh where rh.song_id = s.id
      )
    group by s.id, ls.song_id
  )
  select
    s.id as song_id,
    s.title,
    coalesce(ar.name, 'Independent upload') as artist_name,
    al.title as album_title,
    coalesce(s.cover_path, al.cover_path, ar.image_path) as cover_path,
    s.duration_seconds,
    cs.score
  from candidate_scores cs
  join public.songs s on s.id = cs.id
  left join public.artists ar on ar.id = s.artist_id
  left join public.albums al on al.id = s.album_id
  order by cs.score desc, s.total_plays desc
  limit (select lim from settings);
$$;

-- Fetch a public/private playlist through an unguessable share token.
create or replace function public.get_shared_playlist(p_share_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'description', p.description,
    'cover_path', p.cover_path,
    'visibility', p.visibility,
    'owner', jsonb_build_object(
      'username', pr.username,
      'display_name', pr.display_name,
      'avatar_path', pr.avatar_path
    ),
    'songs', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'title', s.title,
          'slug', s.slug,
          'artist_name', coalesce(ar.name, 'Independent upload'),
          'album_title', al.title,
          'audio_path', s.audio_path,
          'cover_path', coalesce(s.cover_path, al.cover_path, ar.image_path),
          'duration_seconds', s.duration_seconds,
          'position', ps.position
        )
        order by ps.position
      ) filter (where s.id is not null),
      '[]'::jsonb
    )
  )
  from public.playlists p
  join public.profiles pr on pr.id = p.owner_id
  left join public.playlist_songs ps on ps.playlist_id = p.id
  left join public.songs s
    on s.id = ps.song_id
   and s.status = 'published'::public.song_status
  left join public.artists ar on ar.id = s.artist_id
  left join public.albums al on al.id = s.album_id
  where p.share_token = p_share_token
    and p.share_enabled = true
  group by p.id, pr.id;
$$;

-- Admin: change role safely.
create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_role public.app_role;
  active_admin_count integer;
begin
  if not private.is_admin() then
    raise exception 'Admin permission required';
  end if;

  select role into old_role
  from public.profiles
  where id = p_user_id
  for update;

  if old_role is null then
    raise exception 'User not found';
  end if;

  if old_role = 'admin'::public.app_role
     and p_role <> 'admin'::public.app_role then
    select count(*) into active_admin_count
    from public.profiles
    where role = 'admin'::public.app_role
      and is_active = true;

    if active_admin_count <= 1 then
      raise exception 'Cannot remove the last active admin';
    end if;
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id;
end;
$$;

create or replace function public.admin_set_user_active(
  p_user_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.app_role;
  active_admin_count integer;
begin
  if not private.is_admin() then
    raise exception 'Admin permission required';
  end if;

  select role into target_role
  from public.profiles
  where id = p_user_id
  for update;

  if target_role is null then
    raise exception 'User not found';
  end if;

  if target_role = 'admin'::public.app_role and p_is_active = false then
    select count(*) into active_admin_count
    from public.profiles
    where role = 'admin'::public.app_role
      and is_active = true;

    if active_admin_count <= 1 then
      raise exception 'Cannot deactivate the last active admin';
    end if;
  end if;

  update public.profiles
  set is_active = p_is_active
  where id = p_user_id;
end;
$$;

-- Admin dashboard summary cards.
create or replace function public.admin_dashboard_summary()
returns table (
  total_songs bigint,
  published_songs bigint,
  total_artists bigint,
  total_albums bigint,
  total_users bigint,
  total_plays bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Admin permission required';
  end if;

  return query
  select
    (select count(*) from public.songs),
    (select count(*) from public.songs where status = 'published'::public.song_status),
    (select count(*) from public.artists),
    (select count(*) from public.albums),
    (select count(*) from public.profiles),
    (select count(*) from public.song_plays);
end;
$$;

-- Admin dashboard top tracks.
create or replace function public.admin_top_songs(p_limit integer default 10)
returns table (
  song_id uuid,
  title text,
  artist_name text,
  total_plays bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Admin permission required';
  end if;

  return query
  select
    s.id,
    s.title,
    coalesce(ar.name, 'Independent upload'),
    s.total_plays
  from public.songs s
  left join public.artists ar on ar.id = s.artist_id
  order by s.total_plays desc, s.title
  limit least(greatest(coalesce(p_limit, 10), 1), 100);
end;
$$;

-- Admin chart data: day / month / year.
create or replace function public.admin_play_stats(
  p_granularity text default 'day',
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now()
)
returns table (
  period_start timestamptz,
  play_count bigint,
  unique_listeners bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  valid_granularity text;
begin
  if not private.is_admin() then
    raise exception 'Admin permission required';
  end if;

  valid_granularity := case lower(p_granularity)
    when 'day' then 'day'
    when 'month' then 'month'
    when 'year' then 'year'
    else null
  end;

  if valid_granularity is null then
    raise exception 'Granularity must be day, month, or year';
  end if;

  return query
  select
    date_trunc(valid_granularity, sp.played_at) as period_start,
    count(*) as play_count,
    count(distinct sp.user_id) as unique_listeners
  from public.song_plays sp
  where sp.played_at >= p_from
    and sp.played_at < p_to
  group by 1
  order by 1;
end;
$$;

-- ============================================================================
-- 7. FUNCTION PRIVILEGES
-- ============================================================================

revoke all on function public.record_song_play(uuid, uuid, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.record_song_play(uuid, uuid, integer, boolean)
  to authenticated;

revoke all on function public.search_catalog(text, integer)
  from public, anon, authenticated;
grant execute on function public.search_catalog(text, integer)
  to anon, authenticated;

revoke all on function public.recommend_songs(integer)
  from public, anon, authenticated;
grant execute on function public.recommend_songs(integer)
  to authenticated;

revoke all on function public.get_shared_playlist(uuid)
  from public, anon, authenticated;
grant execute on function public.get_shared_playlist(uuid)
  to anon, authenticated;

revoke all on function public.admin_set_user_role(uuid, public.app_role)
  from public, anon, authenticated;
grant execute on function public.admin_set_user_role(uuid, public.app_role)
  to authenticated;

revoke all on function public.admin_set_user_active(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_set_user_active(uuid, boolean)
  to authenticated;

revoke all on function public.admin_dashboard_summary()
  from public, anon, authenticated;
grant execute on function public.admin_dashboard_summary()
  to authenticated;

revoke all on function public.admin_top_songs(integer)
  from public, anon, authenticated;
grant execute on function public.admin_top_songs(integer)
  to authenticated;

revoke all on function public.admin_play_stats(text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_play_stats(text, timestamptz, timestamptz)
  to authenticated;

-- ============================================================================
-- 8. TABLE / VIEW PRIVILEGES
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select on
  public.genres,
  public.artists,
  public.albums,
  public.songs,
  public.song_genres,
  public.lyrics_lines,
  public.playlists,
  public.playlist_songs,
  public.song_catalog,
  public.artist_catalog
to anon, authenticated;

grant select, update on public.profiles to authenticated;

grant insert, update, delete on
  public.genres,
  public.artists,
  public.albums
to authenticated;

grant insert, update, delete on
  public.songs,
  public.song_genres,
  public.lyrics_lines,
  public.playlists,
  public.playlist_songs,
  public.liked_songs
to authenticated;

grant select on public.liked_songs, public.song_plays to authenticated;
grant delete on public.song_plays to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- Direct play insertion is disabled; use public.record_song_play().
revoke insert, update on public.song_plays from anon, authenticated;

-- ============================================================================
-- 9. SUPABASE STORAGE BUCKETS AND POLICIES
-- ============================================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'music-audio',
    'music-audio',
    false,
    104857600,
    array[
      'audio/mpeg',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
      'audio/wav',
      'audio/x-wav',
      'audio/flac'
    ]
  ),
  (
    'music-covers',
    'music-covers',
    true,
    10485760,
    array[
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  ),
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array[
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Audio: published tracks can be read; owners/admin can read drafts.
drop policy if exists "music_audio_select_visible" on storage.objects;
create policy "music_audio_select_visible"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'music-audio'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or private.is_admin()
    or exists (
      select 1
      from public.songs s
      where s.audio_path = storage.objects.name
        and s.status = 'published'::public.song_status
    )
  )
);

drop policy if exists "music_audio_insert_own_folder" on storage.objects;
create policy "music_audio_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'music-audio'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or private.is_admin()
  )
);

drop policy if exists "music_audio_update_own_folder" on storage.objects;
create policy "music_audio_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'music-audio'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or private.is_admin()
  )
)
with check (
  bucket_id = 'music-audio'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or private.is_admin()
  )
);

drop policy if exists "music_audio_delete_own_folder" on storage.objects;
create policy "music_audio_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'music-audio'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or private.is_admin()
  )
);

-- Covers and avatars are publicly readable; authenticated users manage own folder.
drop policy if exists "public_images_select" on storage.objects;
create policy "public_images_select"
on storage.objects
for select
to anon, authenticated
using (bucket_id in ('music-covers', 'avatars'));

drop policy if exists "public_images_insert_own_folder" on storage.objects;
create policy "public_images_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('music-covers', 'avatars')
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or private.is_admin()
  )
);

drop policy if exists "public_images_update_own_folder" on storage.objects;
create policy "public_images_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('music-covers', 'avatars')
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or private.is_admin()
  )
)
with check (
  bucket_id in ('music-covers', 'avatars')
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or private.is_admin()
  )
);

drop policy if exists "public_images_delete_own_folder" on storage.objects;
create policy "public_images_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('music-covers', 'avatars')
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or private.is_admin()
  )
);

-- ============================================================================
-- 10. DEFAULT GENRES
-- ============================================================================

insert into public.genres (name, slug, description)
values
  ('Pop', 'pop', 'Popular music'),
  ('Rock', 'rock', 'Rock music'),
  ('Hip Hop', 'hip-hop', 'Hip hop and rap'),
  ('R&B', 'r-and-b', 'Rhythm and blues'),
  ('Jazz', 'jazz', 'Jazz music'),
  ('Blues', 'blues', 'Blues music'),
  ('Electronic', 'electronic', 'Electronic music'),
  ('Country', 'country', 'Country music'),
  ('Classical', 'classical', 'Classical music'),
  ('Reggae', 'reggae', 'Reggae music'),
  ('Folk', 'folk', 'Folk music'),
  ('Other', 'other', 'Other genres')
on conflict do nothing;

commit;

-- ============================================================================
-- 11. ONE-TIME ADMIN BOOTSTRAP
-- Run AFTER registering the first account. Replace the email.
-- ============================================================================
--
-- update public.profiles
-- set role = 'admin'
-- where id = (
--   select id
--   from auth.users
--   where email = 'your-admin@email.com'
-- );
--
-- ============================================================================
-- 12. EXAMPLE FRONTEND OPERATIONS
-- ============================================================================
--
-- Filter songs:
--   supabase.from('song_catalog').select('*').eq('artist_id', artistId)
--
-- Search:
--   supabase.rpc('search_catalog', { p_query: 'adele', p_limit: 20 })
--
-- Record play:
--   supabase.rpc('record_song_play', {
--     p_song_id: songId,
--     p_session_id: crypto.randomUUID(),
--     p_listened_seconds: 35,
--     p_completed: false
--   })
--
-- Recommendations:
--   supabase.rpc('recommend_songs', { p_limit: 20 })
--
-- Admin chart data:
--   supabase.rpc('admin_play_stats', {
--     p_granularity: 'day',
--     p_from: '2026-08-01T00:00:00Z',
--     p_to: '2026-09-01T00:00:00Z'
--   })
--
-- Shared playlist URL:
--   /shared-playlist/{share_token}
--   supabase.rpc('get_shared_playlist', { p_share_token: token })
--
-- Storage path convention:
--   music-audio/{auth.uid()}/{uuid}.mp3
--   music-covers/{auth.uid()}/{uuid}.webp
--   avatars/{auth.uid()}/{uuid}.webp
