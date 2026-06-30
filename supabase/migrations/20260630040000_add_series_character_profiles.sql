alter table public.series
add column if not exists character_profiles jsonb not null default '[]'::jsonb;

alter table public.series_memory
add column if not exists character_profiles jsonb not null default '[]'::jsonb;

update public.series
set character_profiles = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
        'character:' || regexp_replace(lower(character_name), '[^a-z0-9]+', '-', 'g'),
        'name',
        character_name,
        'description',
        character_name
      )
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements_text(main_characters) as character_name
)
where character_profiles = '[]'::jsonb;

update public.series_memory
set character_profiles = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
        'character:' || regexp_replace(lower(character_name), '[^a-z0-9]+', '-', 'g'),
        'name',
        character_name,
        'description',
        character_name
      )
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements_text(main_characters) as character_name
)
where character_profiles = '[]'::jsonb;

