-- Apply AFTER 001. Keeps per-user spending limits atomic across server instances.
begin;
create table public.tutor_usage (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 day date not null default current_date,
 requests integer not null default 0,
 last_request timestamptz not null default '-infinity'
);
alter table public.tutor_usage enable row level security;
revoke all on public.tutor_usage from public,anon,authenticated;
create function public.claim_tutor_request() returns boolean
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); usage public.tutor_usage;
begin
 if caller is null then raise exception 'Sign-in required' using errcode='42501'; end if;
 insert into public.tutor_usage(owner_id) values(caller) on conflict do nothing;
 select * into usage from public.tutor_usage where owner_id=caller for update;
 if usage.last_request > now()-interval '3 seconds' then return false; end if;
 if usage.day=current_date and usage.requests>=150 then return false; end if;
 update public.tutor_usage set day=current_date,
 requests=case when day=current_date then requests+1 else 1 end,last_request=now() where owner_id=caller;
 return true;
end; $$;
revoke all on function public.claim_tutor_request() from public,anon;
grant execute on function public.claim_tutor_request() to authenticated;
commit;
