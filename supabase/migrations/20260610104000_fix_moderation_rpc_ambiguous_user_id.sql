drop function if exists public.get_user_moderation_state();
drop function if exists public.record_user_moderation_warning(text, jsonb, text, jsonb);

create or replace function public.get_user_moderation_state()
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
language sql
security definer
set search_path = public, auth
as $$
  select
    user_moderation_state.user_id as moderation_user_id,
    user_moderation_state.warning_count,
    user_moderation_state.last_warning_reason,
    user_moderation_state.last_warning_categories,
    user_moderation_state.last_warning_excerpt,
    user_moderation_state.last_warning_at,
    user_moderation_state.banned_at,
    user_moderation_state.active_restriction_id,
    user_moderation_state.updated_at
  from public.user_moderation_state
  where user_moderation_state.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.record_user_moderation_warning(
  warning_reason text,
  warning_categories jsonb,
  warning_excerpt text,
  ban_criteria jsonb
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
  existing_state public.user_moderation_state%rowtype;
  effective_warning_count integer := 0;
  next_warning_count integer := 1;
  now_value timestamptz := now();
  restriction_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select *
  into existing_state
  from public.user_moderation_state
  where public.user_moderation_state.user_id = current_user_id
  for update;

  if existing_state.user_id is not null
    and existing_state.banned_at is not null then
    effective_warning_count := least(existing_state.warning_count, 3);
  elsif existing_state.user_id is not null
    and existing_state.last_warning_at is not null
    and existing_state.last_warning_at >= now_value - interval '1 hour' then
    effective_warning_count := least(existing_state.warning_count, 3);
  end if;

  next_warning_count := least(effective_warning_count + 1, 3);

  insert into public.user_moderation_state (
    user_id,
    warning_count,
    last_warning_reason,
    last_warning_categories,
    last_warning_excerpt,
    last_warning_at,
    banned_at,
    active_restriction_id,
    updated_at
  )
  values (
    current_user_id,
    next_warning_count,
    warning_reason,
    warning_categories,
    warning_excerpt,
    now_value,
    case when next_warning_count >= 3 then now_value else null end,
    null,
    now_value
  )
  on conflict (user_id) do update
  set
    warning_count = excluded.warning_count,
    last_warning_reason = excluded.last_warning_reason,
    last_warning_categories = excluded.last_warning_categories,
    last_warning_excerpt = excluded.last_warning_excerpt,
    last_warning_at = excluded.last_warning_at,
    banned_at = excluded.banned_at,
    active_restriction_id = null,
    updated_at = excluded.updated_at;

  if next_warning_count >= 3 then
    select public.user_restrictions.id
    into restriction_id
    from public.user_restrictions
    where public.user_restrictions.user_id = current_user_id
      and public.user_restrictions.kind = 'full_ban'
      and public.user_restrictions.revoked_at is null
    order by public.user_restrictions.starts_at desc
    limit 1;

    if restriction_id is null then
      insert into public.user_restrictions (
        user_id,
        kind,
        reason,
        criteria,
        starts_at
      )
      values (
        current_user_id,
        'full_ban',
        warning_reason,
        ban_criteria,
        now_value
      )
      returning public.user_restrictions.id into restriction_id;
    end if;

    update public.user_moderation_state
    set
      active_restriction_id = restriction_id,
      banned_at = now_value,
      updated_at = now_value
    where public.user_moderation_state.user_id = current_user_id;
  end if;

  return query
  select
    public.user_moderation_state.user_id as moderation_user_id,
    public.user_moderation_state.warning_count,
    public.user_moderation_state.last_warning_reason,
    public.user_moderation_state.last_warning_categories,
    public.user_moderation_state.last_warning_excerpt,
    public.user_moderation_state.last_warning_at,
    public.user_moderation_state.banned_at,
    public.user_moderation_state.active_restriction_id,
    public.user_moderation_state.updated_at
  from public.user_moderation_state
  where public.user_moderation_state.user_id = current_user_id;
end;
$$;

revoke all on function public.get_user_moderation_state() from public;
revoke all on function public.record_user_moderation_warning(text, jsonb, text, jsonb) from public;

grant execute on function public.get_user_moderation_state() to authenticated;
grant execute on function public.record_user_moderation_warning(text, jsonb, text, jsonb) to authenticated;
