alter table public.outreach_drafts drop constraint if exists outreach_drafts_channel_check;
alter table public.outreach_drafts add constraint outreach_drafts_channel_check check (channel in ('email','linkedin'));
