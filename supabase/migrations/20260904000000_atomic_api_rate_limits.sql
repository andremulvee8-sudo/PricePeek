-- Consume public API limits atomically so concurrent requests cannot lose updates.
-- Identifiers are keyed digests produced by the application; no customer data is
-- returned by this function and existing application records are not modified.

create or replace function public.consume_api_rate_limit(
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  current_count integer;
  current_window_started_at timestamptz;
begin
  if p_identifier is null or length(p_identifier) < 1 or length(p_identifier) > 200 then
    raise exception 'Invalid rate-limit identifier';
  end if;

  if p_limit < 1 or p_limit > 10000 then
    raise exception 'Invalid rate limit';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 604800 then
    raise exception 'Invalid rate-limit window';
  end if;

  insert into public.api_rate_limits as limits (
    identifier,
    request_count,
    window_started_at
  )
  values (p_identifier, 1, v_now)
  on conflict (identifier) do update
  set
    request_count = case
      when limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else least(limits.request_count + 1, p_limit + 1)
    end,
    window_started_at = case
      when limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else limits.window_started_at
    end
  returning request_count, window_started_at
  into current_count, current_window_started_at;

  return query
  select
    current_count <= p_limit,
    greatest(p_limit - current_count, 0),
    current_window_started_at + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;

comment on function public.consume_api_rate_limit(text, integer, integer) is
  'Atomically consumes one server-side API rate-limit allowance.';
