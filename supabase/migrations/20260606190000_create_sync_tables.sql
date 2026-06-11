create table public.series (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  genre text not null,
  cefr_level text not null,
  tone text not null,
  premise text not null,
  participation_mode text not null default 'director' check (participation_mode in ('director', 'character')),
  main_characters jsonb not null default '[]'::jsonb,
  user_role text,
  created_at timestamptz not null,
  client_updated_at timestamptz not null,
  last_operation_id text not null,
  server_updated_at timestamptz not null default now()
);

create table public.series_memory (
  id text primary key,
  series_id text not null references public.series(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  premise text not null,
  genre text not null,
  tone text not null,
  participation_mode text not null default 'director' check (participation_mode in ('director', 'character')),
  main_characters jsonb not null default '[]'::jsonb,
  user_role text,
  current_conflict text,
  known_facts jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  important_objects_or_locations jsonb not null default '[]'::jsonb,
  last_episode_summary text,
  unresolved_cliffhanger text,
  recurring_story_word_ids jsonb not null default '[]'::jsonb,
  client_updated_at timestamptz not null,
  last_operation_id text not null,
  server_updated_at timestamptz not null default now()
);

create table public.episodes (
  id text primary key,
  series_id text not null references public.series(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_index integer not null check (order_index > 0),
  previously_recap text,
  title text,
  scene_text text not null,
  sentences jsonb not null default '[]'::jsonb,
  story_word_ids jsonb not null default '[]'::jsonb,
  annotations jsonb not null default '[]'::jsonb,
  interactions jsonb not null default '[]'::jsonb,
  is_complete boolean not null default false,
  cliffhanger text,
  summary_update text not null,
  created_at timestamptz not null,
  client_updated_at timestamptz not null,
  last_operation_id text not null,
  server_updated_at timestamptz not null default now(),
  unique (series_id, order_index)
);

create table public.word_sets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  series_id text references public.series(id) on delete cascade,
  episode_id text references public.episodes(id) on delete cascade,
  date_key text,
  word_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  client_updated_at timestamptz not null,
  last_operation_id text not null,
  server_updated_at timestamptz not null default now()
);

create table public.learning_signals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null,
  kind text not null,
  series_id text references public.series(id) on delete cascade,
  episode_id text references public.episodes(id) on delete cascade,
  occurred_at timestamptz not null,
  client_updated_at timestamptz not null,
  last_operation_id text not null,
  server_updated_at timestamptz not null default now()
);

create table public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_cefr_level text not null,
  preferred_genre text not null,
  story_word_goal integer not null check (story_word_goal between 0 and 12),
  client_updated_at timestamptz not null,
  last_operation_id text not null,
  server_updated_at timestamptz not null default now()
);

create index series_user_updated_idx
  on public.series (user_id, client_updated_at);
create index series_memory_user_updated_idx
  on public.series_memory (user_id, client_updated_at);
create index episodes_user_updated_idx
  on public.episodes (user_id, client_updated_at);
create index episodes_series_order_idx
  on public.episodes (series_id, order_index);
create index word_sets_user_updated_idx
  on public.word_sets (user_id, client_updated_at);
create index learning_signals_user_updated_idx
  on public.learning_signals (user_id, client_updated_at);

create or replace function public.keep_newest_client_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.client_updated_at, new.last_operation_id)
    < (old.client_updated_at, old.last_operation_id) then
    return old;
  end if;

  new.server_updated_at = now();
  return new;
end;
$$;

create trigger series_keep_newest_client_write
before update on public.series
for each row execute function public.keep_newest_client_write();

create trigger series_memory_keep_newest_client_write
before update on public.series_memory
for each row execute function public.keep_newest_client_write();

create trigger episodes_keep_newest_client_write
before update on public.episodes
for each row execute function public.keep_newest_client_write();

create trigger word_sets_keep_newest_client_write
before update on public.word_sets
for each row execute function public.keep_newest_client_write();

create trigger learning_signals_keep_newest_client_write
before update on public.learning_signals
for each row execute function public.keep_newest_client_write();

create trigger preferences_keep_newest_client_write
before update on public.preferences
for each row execute function public.keep_newest_client_write();

alter table public.series enable row level security;
alter table public.series_memory enable row level security;
alter table public.episodes enable row level security;
alter table public.word_sets enable row level security;
alter table public.learning_signals enable row level security;
alter table public.preferences enable row level security;

create policy "Users manage own series"
on public.series for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users manage own series memory"
on public.series_memory for all
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.series
    where series.id = series_memory.series_id
      and series.user_id = (select auth.uid())
  )
);

create policy "Users manage own episodes"
on public.episodes for all
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.series
    where series.id = episodes.series_id
      and series.user_id = (select auth.uid())
  )
);

create policy "Users manage own word sets"
on public.word_sets for all
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    series_id is null
    or exists (
      select 1
      from public.series
      where series.id = word_sets.series_id
        and series.user_id = (select auth.uid())
    )
  )
  and (
    episode_id is null
    or exists (
      select 1
      from public.episodes
      where episodes.id = word_sets.episode_id
        and episodes.user_id = (select auth.uid())
    )
  )
);

create policy "Users manage own learning signals"
on public.learning_signals for all
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    series_id is null
    or exists (
      select 1
      from public.series
      where series.id = learning_signals.series_id
        and series.user_id = (select auth.uid())
    )
  )
  and (
    episode_id is null
    or exists (
      select 1
      from public.episodes
      where episodes.id = learning_signals.episode_id
        and episodes.user_id = (select auth.uid())
    )
  )
);

create policy "Users manage own preferences"
on public.preferences for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
