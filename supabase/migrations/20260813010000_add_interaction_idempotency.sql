alter table public.generation_requests
drop constraint if exists generation_requests_operation_check;

alter table public.generation_requests
add constraint generation_requests_operation_check check (
  operation in (
    'generate-episode',
    'generate-series-setup',
    'submit-interaction'
  )
);

create or replace function public.claim_generation_request(
  p_user_id uuid,
  p_request_id text,
  p_operation text,
  p_scope_id text,
  p_request_fingerprint text
)
returns table (
  action text,
  canonical_request_id text,
  cached_response jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_request_id text;
  existing_request public.generation_requests%rowtype;
begin
  insert into public.generation_requests (
    user_id,
    request_id,
    operation,
    scope_id,
    request_fingerprint,
    status,
    lease_expires_at
  )
  values (
    p_user_id,
    p_request_id,
    p_operation,
    p_scope_id,
    p_request_fingerprint,
    'generating',
    now() + interval '5 minutes'
  )
  on conflict do nothing
  returning request_id into inserted_request_id;

  select *
  into existing_request
  from public.generation_requests
  where user_id = p_user_id
    and operation = p_operation
    and scope_id = p_scope_id
  for update;

  if not found then
    raise exception 'Generation request claim could not be resolved.';
  end if;

  if existing_request.request_fingerprint <> p_request_fingerprint then
    if p_operation in ('generate-episode', 'submit-interaction')
      and existing_request.status = 'completed'
      and existing_request.request_id = p_request_id
      and existing_request.response is not null then
      return query
        select 'cached', existing_request.request_id, existing_request.response;
      return;
    end if;

    if existing_request.status = 'completed'
      or (
        existing_request.status = 'generating'
        and existing_request.lease_expires_at > now()
      ) then
      return query select 'conflict', existing_request.request_id, null::jsonb;
      return;
    end if;

    update public.generation_requests
    set request_id = p_request_id,
        request_fingerprint = p_request_fingerprint,
        status = 'generating',
        response = null,
        lease_expires_at = now() + interval '5 minutes',
        updated_at = now()
    where user_id = p_user_id
      and operation = p_operation
      and scope_id = p_scope_id;

    return query select 'execute', p_request_id, null::jsonb;
    return;
  end if;

  if inserted_request_id is not null then
    return query select 'execute', existing_request.request_id, null::jsonb;
    return;
  end if;

  if existing_request.status = 'completed' then
    return query
      select 'cached', existing_request.request_id, existing_request.response;
    return;
  end if;

  if existing_request.status = 'generating'
    and existing_request.lease_expires_at > now() then
    return query select 'in_progress', existing_request.request_id, null::jsonb;
    return;
  end if;

  update public.generation_requests
  set status = 'generating',
      response = null,
      lease_expires_at = now() + interval '5 minutes',
      updated_at = now()
  where user_id = p_user_id
    and operation = p_operation
    and scope_id = p_scope_id;

  return query select 'execute', existing_request.request_id, null::jsonb;
end;
$$;

revoke all on function public.claim_generation_request(uuid, text, text, text, text)
from public, anon, authenticated;

grant execute on function public.claim_generation_request(uuid, text, text, text, text)
to service_role;
