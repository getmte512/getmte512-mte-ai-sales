alter table public.outreach_drafts
  add column if not exists purpose text not null default 'initial_outreach'
  check (purpose in ('initial_outreach','reorder_follow_up'));

alter table public.outreach_drafts
  drop constraint if exists outreach_drafts_contact_id_channel_key;

create unique index if not exists outreach_drafts_contact_channel_purpose_idx
  on public.outreach_drafts(contact_id,channel,purpose);
