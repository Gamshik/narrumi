create table public.user_moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_kind text not null check (event_kind in ('warning', 'ban')),
  source_function text not null,
  warning_count integer not null check (warning_count between 1 and 3),
  categories jsonb not null default '[]'::jsonb,
  reason text not null,
  excerpt text not null,
  signals jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(categories) = 'array'),
  check (jsonb_typeof(signals) = 'array'),
  check (jsonb_typeof(details) = 'object')
);

comment on table public.user_moderation_events is
  'Immutable moderation audit log for warnings and bans.';
comment on column public.user_moderation_events.event_kind is
  'Event type captured after each blocked AI request.';
comment on column public.user_moderation_events.source_function is
  'Edge Function or moderation source that detected the violation.';
comment on column public.user_moderation_events.warning_count is
  'Warning count after the current violation has been applied.';
comment on column public.user_moderation_events.categories is
  'Normalized moderation categories detected for the blocked request.';
comment on column public.user_moderation_events.reason is
  'Safe user-facing summary of why the request was blocked.';
comment on column public.user_moderation_events.excerpt is
  'Short excerpt that triggered moderation for moderator review.';
comment on column public.user_moderation_events.signals is
  'Detailed signal objects with source labels and evidence snippets.';
comment on column public.user_moderation_events.details is
  'Structured audit metadata for moderator review and appeals.';

create index user_moderation_events_user_created_idx
  on public.user_moderation_events (user_id, created_at desc);

alter table public.user_moderation_events enable row level security;

revoke all
on table public.user_moderation_events
from anon, authenticated;
