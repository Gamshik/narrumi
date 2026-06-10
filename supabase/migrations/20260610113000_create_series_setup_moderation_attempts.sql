create table public.user_moderation_soft_block_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_reason text not null,
  last_attempt_categories jsonb not null default '[]'::jsonb,
  last_attempt_excerpt text not null,
  last_attempt_signals jsonb not null default '[]'::jsonb,
  last_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, scope),
  check (jsonb_typeof(last_attempt_categories) = 'array'),
  check (jsonb_typeof(last_attempt_signals) = 'array')
);

comment on table public.user_moderation_soft_block_state is
  'Hourly counters for blocked validation attempts that do not immediately create moderation warnings.';
comment on column public.user_moderation_soft_block_state.scope is
  'Moderation source scope, for example series_setup.';
comment on column public.user_moderation_soft_block_state.attempt_count is
  'Blocked attempt count in the current one-hour window.';
comment on column public.user_moderation_soft_block_state.last_attempt_signals is
  'Latest blocked setup signals for moderator review.';

alter table public.user_moderation_soft_block_state enable row level security;

revoke all
on table public.user_moderation_soft_block_state
from anon, authenticated;

create or replace function public.record_user_moderation_soft_block(
  p_source_function text,
  p_block_scope text,
  p_block_reason text,
  p_block_categories jsonb,
  p_block_excerpt text,
  p_block_signals jsonb,
  p_warning_threshold integer default 10
)
returns table (
  moderation_user_id uuid,
  block_scope text,
  attempt_count integer,
  attempts_remaining integer,
  did_record_warning boolean,
  warning_count integer,
  warnings_remaining integer,
  banned_at timestamptz,
  active_restriction_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  existing_state public.user_moderation_soft_block_state%rowtype;
  effective_attempt_count integer := 0;
  next_attempt_count integer := 1;
  now_value timestamptz := now();
  warning_state record;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if p_warning_threshold < 1 then
    raise exception 'Warning threshold must be positive.';
  end if;

  select *
  into existing_state
  from public.user_moderation_soft_block_state
  where public.user_moderation_soft_block_state.user_id = current_user_id
    and public.user_moderation_soft_block_state.scope = p_block_scope
  for update;

  if existing_state.user_id is not null
    and existing_state.last_attempt_at >= now_value - interval '1 hour' then
    effective_attempt_count := existing_state.attempt_count;
  end if;

  next_attempt_count := effective_attempt_count + 1;

  insert into public.user_moderation_soft_block_state (
    user_id,
    scope,
    attempt_count,
    last_attempt_reason,
    last_attempt_categories,
    last_attempt_excerpt,
    last_attempt_signals,
    last_attempt_at,
    updated_at
  )
  values (
    current_user_id,
    p_block_scope,
    next_attempt_count,
    p_block_reason,
    p_block_categories,
    p_block_excerpt,
    p_block_signals,
    now_value,
    now_value
  )
  on conflict (user_id, scope) do update
  set
    attempt_count = excluded.attempt_count,
    last_attempt_reason = excluded.last_attempt_reason,
    last_attempt_categories = excluded.last_attempt_categories,
    last_attempt_excerpt = excluded.last_attempt_excerpt,
    last_attempt_signals = excluded.last_attempt_signals,
    last_attempt_at = excluded.last_attempt_at,
    updated_at = excluded.updated_at;

  if next_attempt_count <= p_warning_threshold then
    return query
    select
      current_user_id,
      p_block_scope,
      next_attempt_count,
      greatest(p_warning_threshold - next_attempt_count, 0),
      false,
      null::integer,
      null::integer,
      null::timestamptz,
      null::uuid,
      now_value;

    return;
  end if;

  select *
  into warning_state
  from public.record_user_moderation_warning(
    p_source_function,
    p_block_reason,
    p_block_categories,
    p_block_excerpt,
    jsonb_build_object(
      'warningTrigger',
      'series_setup_soft_block_threshold',
      'softBlockScope',
      p_block_scope,
      'attemptCount',
      next_attempt_count,
      'warningThreshold',
      p_warning_threshold,
      'categories',
      p_block_categories,
      'evidence',
      p_block_signals
    )
  );

  return query
  select
    current_user_id,
    p_block_scope,
    next_attempt_count,
    0,
    true,
    warning_state.warning_count::integer,
    greatest(3 - warning_state.warning_count::integer, 0),
    warning_state.banned_at::timestamptz,
    warning_state.active_restriction_id::uuid,
    now_value;
end;
$$;

revoke all on function public.record_user_moderation_soft_block(
  text,
  text,
  text,
  jsonb,
  text,
  jsonb,
  integer
) from public;

grant execute on function public.record_user_moderation_soft_block(
  text,
  text,
  text,
  jsonb,
  text,
  jsonb,
  integer
) to authenticated;
