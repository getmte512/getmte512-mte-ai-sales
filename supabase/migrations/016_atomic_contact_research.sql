create or replace function public.save_contact_research(
  p_contact_id uuid,
  p_actor_id uuid,
  p_fields jsonb,
  p_source_type text,
  p_source_url text,
  p_confidence text,
  p_research_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_email text;
  v_new_email text;
  v_evidence_id uuid;
begin
  if p_source_type not in ('linkedin','company_website') then
    raise exception 'Unsupported research source type';
  end if;
  if p_confidence not in ('medium','high') then
    raise exception 'Unsupported research confidence';
  end if;
  if p_source_url is null or btrim(p_source_url) = '' or p_source_url !~* '^https?://' then
    raise exception 'A reviewable HTTP(S) research source is required';
  end if;
  if p_research_note is null or btrim(p_research_note) = '' then
    raise exception 'Research note is required';
  end if;
  if not exists(select 1 from auth.users where id = p_actor_id) then
    raise exception 'Invalid research actor';
  end if;

  select email into v_existing_email
  from public.contacts
  where id = p_contact_id
  for update;

  if not found then
    raise exception 'Contact not found';
  end if;

  v_new_email := nullif(btrim(p_fields->>'email'),'');

  update public.contacts set
    buyer_name = nullif(btrim(p_fields->>'buyer_name'),''),
    job_title = nullif(btrim(p_fields->>'job_title'),''),
    email = v_new_email,
    normalized_email = case when v_new_email is null then null else lower(v_new_email) end,
    phone = nullif(btrim(p_fields->>'phone'),''),
    linkedin_url = nullif(btrim(p_fields->>'linkedin_url'),''),
    website = nullif(btrim(p_fields->>'website'),''),
    category = nullif(btrim(p_fields->>'category'),''),
    state = nullif(btrim(p_fields->>'state'),''),
    notes = nullif(btrim(p_fields->>'notes'),''),
    updated_at = now()
  where id = p_contact_id;

  if lower(coalesce(v_existing_email,'')) is distinct from lower(coalesce(v_new_email,'')) then
    delete from public.contact_email_history where contact_id = p_contact_id;
  end if;

  insert into public.contact_research_evidence(
    contact_id, source_type, source_url, confidence, research_note, researched_by
  ) values (
    p_contact_id, p_source_type, p_source_url, p_confidence, p_research_note, p_actor_id
  ) returning id into v_evidence_id;

  return jsonb_build_object(
    'contact_id', p_contact_id,
    'research_evidence_id', v_evidence_id,
    'source_type', p_source_type,
    'source_url', p_source_url,
    'confidence', p_confidence
  );
end;
$$;

revoke all on function public.save_contact_research(uuid,uuid,jsonb,text,text,text,text) from public, anon, authenticated;
grant execute on function public.save_contact_research(uuid,uuid,jsonb,text,text,text,text) to service_role;
