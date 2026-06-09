create table public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (
    kind in (
      'full_ban',
      'ai_generation_block',
      'interaction_block',
      'sync_block',
      'write_block'
    )
  ),
  reason text not null,
  criteria jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text,
  check (jsonb_typeof(criteria) = 'object'),
  check (ends_at is null or ends_at > starts_at),
  check (revoked_at is null or revoked_at >= created_at)
);

comment on table public.user_restrictions is
  'Server-managed moderation restrictions keyed to Supabase Auth users.';
comment on column public.user_restrictions.kind is
  'Restriction category used by Edge Functions and future access-policy checks.';
comment on column public.user_restrictions.criteria is
  'Structured evidence or rule inputs that caused the restriction.';
comment on column public.user_restrictions.created_by is
  'Moderator or automation user id when the source is represented in Supabase Auth.';
comment on column public.user_restrictions.revoked_at is
  'Timestamp that disables a restriction before its natural end time.';

create index user_restrictions_user_active_idx
  on public.user_restrictions (user_id, kind, starts_at, ends_at)
  where revoked_at is null;

create index user_restrictions_created_at_idx
  on public.user_restrictions (created_at desc);

alter table public.user_restrictions enable row level security;

revoke all
on table public.user_restrictions
from anon, authenticated;
