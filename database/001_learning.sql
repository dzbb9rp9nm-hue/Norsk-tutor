-- Norsk Tutor: create private learning storage in a NEW Supabase project.
-- Validated in an isolated PostgreSQL test. This file does not upload conversations.
-- Run as the migration owner, once. No service-role key belongs in browser code.
begin;

create table public.learning_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null,
  kind text not null check (kind in ('session', 'phrase', 'preferences')),
  body jsonb not null check (jsonb_typeof(body) = 'object' and octet_length(body::text) <= 1000000),
  revision bigint not null default 1 check (revision > 0),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner_id, record_id)
);
create index learning_records_owner_updated on public.learning_records(owner_id, updated_at);
alter table public.learning_records enable row level security;
alter table public.learning_records force row level security;

-- Only owners can read. There is no anonymous access and no direct client mutation.
revoke all on public.learning_records from public, anon, authenticated;
grant select on public.learning_records to authenticated;
create policy learning_owner_read on public.learning_records for select to authenticated
  using (owner_id = (select auth.uid()));

-- Every write obtains the caller's identity from the verified Supabase session.
-- No caller-supplied owner ID, dynamic SQL, or last-writer-wins overwrite.
create function public.save_learning_record(
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
begin
  if caller is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  if p_record_id is null or p_kind is null or p_kind not in ('session','phrase','preferences')
     or p_body is null or jsonb_typeof(p_body) <> 'object'
     or octet_length(p_body::text) > 1000000
     or p_expected_revision is null or p_expected_revision < 0 or p_deleted is null then
    raise exception 'Invalid learning record' using errcode = '22023';
  end if;
  if p_body ?| array['apiKey','api_key','nt_key','access_token','refresh_token','service_role'] then
    raise exception 'Credentials are not learning data' using errcode = '22023';
  end if;
  -- Tombstones have an empty body. Active records have the corresponding schema.
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
  end if;

  -- Serialize all writes for one owner, including simultaneous first inserts.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text, 0));
  select * into current_record from public.learning_records
    where owner_id = caller and record_id = p_record_id for update;
  if found then
    if current_record.revision <> p_expected_revision or current_record.kind <> p_kind then
      return jsonb_build_object('saved',false,'conflict',true,'record',to_jsonb(current_record));
    end if;
    update public.learning_records
      set body = case when p_deleted then '{}'::jsonb else p_body end,
          revision = revision + 1, deleted = p_deleted, updated_at = now()
      where owner_id = caller and record_id = p_record_id
      returning * into result_record;
  else
    if p_expected_revision <> 0 then
      return jsonb_build_object('saved',false,'conflict',true,'record',null);
    end if;
    if (select count(*) from public.learning_records where owner_id=caller) >= 6000 then
      raise exception 'Learning record limit reached' using errcode = '54000';
    end if;
    insert into public.learning_records(owner_id,record_id,kind,body,deleted)
      values(caller,p_record_id,p_kind,case when p_deleted then '{}'::jsonb else p_body end,p_deleted)
      returning * into result_record;
  end if;
  return jsonb_build_object('saved',true,'conflict',false,'record',to_jsonb(result_record));
end;
$$;
revoke all on function public.save_learning_record(uuid,text,jsonb,bigint,boolean) from public, anon;
grant execute on function public.save_learning_record(uuid,text,jsonb,bigint,boolean) to authenticated;
commit;

-- After a successful run, these three checks should all say true.
select
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.learning_records'::regclass) as access_rules_enabled,
  not has_table_privilege('anon', 'public.learning_records', 'SELECT') as anonymous_access_blocked,
  (not has_table_privilege('authenticated', 'public.learning_records', 'UPDATE')
   and has_function_privilege('authenticated', 'public.save_learning_record(uuid,text,jsonb,bigint,boolean)', 'EXECUTE')) as controlled_saving_enabled;
