create table public.user_moderation_warning_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_function text not null,
  request_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, source_function, request_key),
  check (char_length(request_key) between 1 and 500)
);

comment on table public.user_moderation_warning_receipts is
  'Idempotency receipts that prevent one logical AI request from creating repeated moderation warnings.';
comment on column public.user_moderation_warning_receipts.request_key is
  'Stable generation or interaction identity supplied by an authenticated Edge Function.';

alter table public.user_moderation_warning_receipts enable row level security;

revoke all
on table public.user_moderation_warning_receipts
from anon, authenticated;

create or replace function public.record_user_moderation_warning_once(
  p_source_function text,
  p_request_key text,
  p_warning_reason text,
  p_warning_categories jsonb,
  p_warning_excerpt text,
  p_ban_criteria jsonb
)
returns table (
  moderation_user_id uuid,
  warning_count integer,
  last_warning_reason text,
  last_warning_categories jsonb,
  last_warning_excerpt text,
  last_warning_at timestamptz,
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
  receipt_was_created boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if nullif(trim(p_source_function), '') is null then
    raise exception 'Moderation source function is required.';
  end if;

  if nullif(trim(p_request_key), '') is null then
    raise exception 'Moderation request key is required.';
  end if;

  insert into public.user_moderation_warning_receipts (
    user_id,
    source_function,
    request_key
  )
  values (
    current_user_id,
    p_source_function,
    p_request_key
  )
  on conflict (user_id, source_function, request_key) do nothing
  returning true into receipt_was_created;

  if coalesce(receipt_was_created, false) then
    return query
    select
      warning_state.moderation_user_id,
      warning_state.warning_count,
      warning_state.last_warning_reason,
      warning_state.last_warning_categories,
      warning_state.last_warning_excerpt,
      warning_state.last_warning_at,
      warning_state.banned_at,
      warning_state.active_restriction_id,
      warning_state.updated_at
    from public.record_user_moderation_warning(
      p_source_function,
      p_warning_reason,
      p_warning_categories,
      p_warning_excerpt,
      p_ban_criteria
    ) as warning_state;

    return;
  end if;

  return query
  select
    state.user_id,
    state.warning_count,
    state.last_warning_reason,
    state.last_warning_categories,
    state.last_warning_excerpt,
    state.last_warning_at,
    state.banned_at,
    state.active_restriction_id,
    state.updated_at
  from public.user_moderation_state as state
  where state.user_id = current_user_id;
end;
$$;

revoke all on function public.record_user_moderation_warning_once(
  text,
  text,
  text,
  jsonb,
  text,
  jsonb
) from public;

grant execute on function public.record_user_moderation_warning_once(
  text,
  text,
  text,
  jsonb,
  text,
  jsonb
) to authenticated;
