alter table public.episodes
  add column if not exists cefr_level text,
  add column if not exists genre text;

-- Existing episodes inherit their former series-level generation settings.
update public.episodes as episode
set
  cefr_level = coalesce(episode.cefr_level, series.cefr_level),
  genre = coalesce(episode.genre, series.genre)
from public.series as series
where episode.series_id = series.id
  and (episode.cefr_level is null or episode.genre is null);

-- Columns remain nullable so clients released before this migration can still sync.
comment on column public.episodes.cefr_level is
  'Episode-level CEFR target. Nullable only for backward compatibility with older clients.';
comment on column public.episodes.genre is
  'Episode-level story genre. Nullable only for backward compatibility with older clients.';
