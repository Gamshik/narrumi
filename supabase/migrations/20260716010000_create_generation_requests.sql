create table public.generation_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null,
  operation text not null check (
    operation in ('generate-episode', 'generate-series-setup')
  ),
  scope_id text not null,
  request_fingerprint text not null,
  status text not null check (status in ('generating', 'completed', 'failed')),
  response jsonb,
  lease_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, request_id),
  unique (user_id, operation, scope_id)
);

alter table public.generation_requests enable row level security;

create policy "Users read own generation requests"
on public.generation_requests for select
using ((select auth.uid()) = user_id);

revoke all on table public.generation_requests from anon, authenticated;
grant select on table public.generation_requests to authenticated;

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
    return query select 'conflict', existing_request.request_id, null::jsonb;
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

create or replace function public.complete_generation_request(
  p_user_id uuid,
  p_operation text,
  p_scope_id text,
  p_request_fingerprint text,
  p_response jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.generation_requests
  set status = 'completed',
      response = p_response,
      updated_at = now(),
      lease_expires_at = now()
  where user_id = p_user_id
    and operation = p_operation
    and scope_id = p_scope_id
    and request_fingerprint = p_request_fingerprint;

  if not found then
    raise exception 'Generation request completion did not match its claim.';
  end if;
end;
$$;

create or replace function public.fail_generation_request(
  p_user_id uuid,
  p_operation text,
  p_scope_id text,
  p_request_fingerprint text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.generation_requests
  set status = 'failed',
      response = null,
      updated_at = now(),
      lease_expires_at = now()
  where user_id = p_user_id
    and operation = p_operation
    and scope_id = p_scope_id
    and request_fingerprint = p_request_fingerprint;
end;
$$;

revoke all on function public.claim_generation_request(uuid, text, text, text, text)
from public, anon, authenticated;
revoke all on function public.complete_generation_request(uuid, text, text, text, jsonb)
from public, anon, authenticated;
revoke all on function public.fail_generation_request(uuid, text, text, text)
from public, anon, authenticated;

grant execute on function public.claim_generation_request(uuid, text, text, text, text)
to service_role;
grant execute on function public.complete_generation_request(uuid, text, text, text, jsonb)
to service_role;
grant execute on function public.fail_generation_request(uuid, text, text, text)
to service_role;
