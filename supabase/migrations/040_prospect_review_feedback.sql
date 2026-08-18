alter table public.prospect_discovery_candidates
  add column if not exists review_reason text;

alter table public.prospect_discovery_candidates
  drop constraint if exists prospect_discovery_candidates_review_reason_check;
alter table public.prospect_discovery_candidates
  add constraint prospect_discovery_candidates_review_reason_check check (
    review_reason is null or review_reason in (
      'strong_fit','verified_buyer','strategic_account',
      'wrong_retailer_fit','wrong_role','weak_source','stale_contact','insufficient_evidence','duplicate_existing','other'
    )
  );

create or replace function public.review_prospect_discovery_candidate_with_reason(
  p_candidate_id uuid,
  p_actor_id uuid,
  p_decision text,
  p_review_reason text,
  p_review_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if p_decision='accept' and p_review_reason not in ('strong_fit','verified_buyer','strategic_account') then
    raise exception 'Select an acceptance reason';
  end if;
  if p_decision='reject' and p_review_reason not in ('wrong_retailer_fit','wrong_role','weak_source','stale_contact','insufficient_evidence','duplicate_existing','other') then
    raise exception 'Select a rejection reason';
  end if;

  v_result := public.review_prospect_discovery_candidate(p_candidate_id,p_actor_id,p_decision,p_review_note);

  update public.prospect_discovery_candidates
  set review_reason=p_review_reason, updated_at=now()
  where id=p_candidate_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('prospect_discovery_review_reason_recorded','prospect_discovery_candidate',p_candidate_id::text,p_actor_id,
    jsonb_build_object('decision',p_decision,'review_reason',p_review_reason));

  return v_result || jsonb_build_object('review_reason',p_review_reason);
end;
$$;

revoke all on function public.review_prospect_discovery_candidate_with_reason(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.review_prospect_discovery_candidate_with_reason(uuid,uuid,text,text,text) to service_role;
