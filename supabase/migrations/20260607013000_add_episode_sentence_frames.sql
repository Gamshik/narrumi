alter table public.episodes
  add column sentence_frames jsonb not null default '[]'::jsonb;

update public.episodes
set sentence_frames = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object(
        'kind',
        'narration',
        'text',
        sentence.value
      )
      order by sentence.ordinality
    )
    from jsonb_array_elements_text(episodes.sentences) with ordinality as sentence(value, ordinality)
  ),
  '[]'::jsonb
)
where sentence_frames = '[]'::jsonb;
