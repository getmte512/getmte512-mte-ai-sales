alter table public.outreach_drafts drop constraint if exists outreach_drafts_channel_check;
alter table public.outreach_drafts add constraint outreach_drafts_channel_check check (channel in ('email','linkedin','text'));

create table if not exists public.contact_channel_consents(
 id uuid primary key default gen_random_uuid(),
 contact_id uuid not null references public.contacts(id) on delete cascade,
 channel text not null check(channel in ('text')),
 status text not null check(status in ('opted_in','revoked')),
 source text not null check(length(btrim(source)) between 3 and 500),
 recorded_by uuid not null references auth.users(id) on delete restrict,
 recorded_at timestamptz not null default now(),
 unique(contact_id,channel)
);
alter table public.contact_channel_consents enable row level security;
create index if not exists contact_channel_consents_contact_idx on public.contact_channel_consents(contact_id,channel);
