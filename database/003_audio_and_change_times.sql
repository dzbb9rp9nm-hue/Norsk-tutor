-- Norsk Tutor: apply AFTER 001 and 002. Safe to run more than once.
-- 1. Allows a new record kind, 'audio', for Listen & repeat progress (one record per account).
-- 2. Stamps every save with the exact time it happened (clock_timestamp), taken after the
--    per-account lock, so "changed since" downloads can never miss a save.
begin;

alter table public.learning_records drop constraint if exists learning_records_kind_check;
alter table public.learning_records add constraint learning_records_kind_check
  check (kind in ('session', 'phrase', 'preferences', 'audio'));

create or replace function public.save_learning_record(
  p_record_id uuid,
  p_kind text,
  p_body jsonb,
  p_expected_revision bigint,
  p_deleted boolean default false
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  current_record public.learning_records;
  result_record public.learning_records;
  stamp timestamptz;
begin
  if caller is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  if p_record_id is null or p_kind is null or p_kind not in ('session','phrase','preferences','audio')
     or p_body is null or jsonb_typeof(p_body) <> 'object'
     or octet_length(p_body::text) > 1000000
     or p_expected_revision is null or p_expected_revision < 0 or p_deleted is null then
    raise exception 'Invalid learning record' using errcode = '22023';
  end if;
  if p_body ?| array['apiKey','api_key','nt_key','access_token','refresh_token','service_role'] then
    raise exception 'Credentials are not learning data' using errcode = '22023';
  end if;
  if not p_deleted then
    if p_kind in ('session','phrase') and (p_body->>'id') is distinct from p_record_id::text then
      raise exception 'Record ID mismatch' using errcode = '22023';
    end if;
    if p_kind = 'session' and (
      jsonb_typeof(p_body->'messages') is distinct from 'array' or
      jsonb_typeof(p_body->'api') is distinct from 'array' or
      jsonb_typeof(p_body->'scenario') is distinct from 'string' or
      jsonb_typeof(p_body->'draft') is distinct from 'string') then
      raise exception 'Invalid session' using errcode = '22023';
    end if;
    if p_kind = 'phrase' and (
      jsonb_typeof(p_body->'nb') is distinct from 'string' or
      jsonb_typeof(p_body->'en') is distinct from 'string') then
      raise exception 'Invalid phrase' using errcode = '22023';
    end if;
    if p_kind = 'preferences' and (p_body - array['speed','corrections','handsFree','pause']) <> '{}'::jsonb then
      raise exception 'Invalid preferences' using errcode = '22023';
    end if;
    if p_kind = 'audio' and (
      p_record_id <> 'a0d10000-0000-4000-8000-000000000001'::uuid or
      jsonb_typeof(p_body->'progress') is distinct from 'object' or
      jsonb_typeof(p_body->'ratings') is distinct from 'object' or
      (p_body - array['progress','ratings']) <> '{}'::jsonb) then
      raise exception 'Invalid lesson progress' using errcode = '22023';
    end if;
  end if;

  -- Serialize all writes for one owner, including simultaneous first inserts.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text, 0));
  stamp := pg_catalog.clock_timestamp();
  select * into current_record from public.learning_records
    where owner_id = caller and record_id = p_record_id for update;
  if found then
    if current_record.revision <> p_expected_revision or current_record.kind <> p_kind then
      return jsonb_build_object('saved',false,'conflict',true,'record',to_jsonb(current_record));
    end if;
    update public.learning_records
      set body = case when p_deleted then '{}'::jsonb else p_body end,
          revision = revision + 1, deleted = p_deleted, updated_at = stamp
      where owner_id = caller and record_id = p_record_id
      returning * into result_record;
  else
    if p_expected_revision <> 0 then
      return jsonb_build_object('saved',false,'conflict',true,'record',null);
    end if;
    if (select count(*) from public.learning_records where owner_id=caller) >= 6000 then
      raise exception 'Learning record limit reached' using errcode = '54000';
    end if;
    insert into public.learning_records(owner_id,record_id,kind,body,deleted,updated_at)
      values(caller,p_record_id,p_kind,case when p_deleted then '{}'::jsonb else p_body end,p_deleted,stamp)
      returning * into result_record;
  end if;
  return jsonb_build_object('saved',true,'conflict',false,'record',to_jsonb(result_record));
end;
$$;
revoke all on function public.save_learning_record(uuid,text,jsonb,bigint,boolean) from public, anon;
grant execute on function public.save_learning_record(uuid,text,jsonb,bigint,boolean) to authenticated;

-- Pages are read in change order; this index makes that fast.
create index if not exists learning_records_owner_changed on public.learning_records(owner_id, updated_at, record_id);
commit;

-- After running, this should say true.
select pg_catalog.pg_get_constraintdef(oid) like '%audio%' as lesson_progress_enabled
  from pg_catalog.pg_constraint where conname = 'learning_records_kind_check';
