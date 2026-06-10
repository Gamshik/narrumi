create table public.user_moderation_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  warning_count integer not null default 0 check (warning_count between 0 and 3),
  last_warning_reason text,
  last_warning_categories jsonb not null default '[]'::jsonb,
  last_warning_excerpt text,
  last_warning_at timestamptz,
  banned_at timestamptz,
  active_restriction_id uuid references public.user_restrictions(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(last_warning_categories) = 'array')
);

comment on table public.user_moderation_state is
  'Server-managed warning counter for repeated policy violations.';
comment on column public.user_moderation_state.warning_count is
  'Number of moderation warnings accumulated before a ban is applied.';
comment on column public.user_moderation_state.last_warning_reason is
  'Short server-side summary of the latest blocked request.';
comment on column public.user_moderation_state.last_warning_categories is
  'Normalized policy categories detected in the latest blocked request.';
comment on column public.user_moderation_state.active_restriction_id is
  'Current ban row linked once the warning counter reaches the ban threshold.';

create index user_moderation_state_updated_at_idx
  on public.user_moderation_state (updated_at desc);

alter table public.user_moderation_state enable row level security;

revoke all
on table public.user_moderation_state
from anon, authenticated;
