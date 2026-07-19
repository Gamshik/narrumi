update public.series
set creative_brief =
  (creative_brief - 'aiFreedom') ||
  jsonb_build_object(
    'draftStrategy',
    coalesce(creative_brief ->> 'draftStrategy', 'fill-missing')
  );

alter table public.series
alter column creative_brief set default '{
  "idea": "",
  "worldAndSetting": "",
  "backstory": "",
  "storyDriver": "",
  "mustInclude": "",
  "avoid": "",
  "draftStrategy": "fill-missing"
}'::jsonb;
