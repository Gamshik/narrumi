alter table public.series
add column if not exists creative_brief jsonb not null default '{
  "idea": "",
  "worldAndSetting": "",
  "backstory": "",
  "storyDriver": "",
  "mustInclude": "",
  "avoid": "",
  "aiFreedom": "collaborative"
}'::jsonb;

alter table public.series
add column if not exists setup_draft_meta jsonb not null default '{
  "aiGeneratedFields": []
}'::jsonb;
