alter table public.outreach_delivery_intents
  add column if not exists provider_rfc_message_id text;
create unique index if not exists outreach_delivery_intents_rfc_message_uidx
  on public.outreach_delivery_intents(provider_rfc_message_id)
  where provider_rfc_message_id is not null;

create table if not exists public.outreach_delivery_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  intent_id uuid references public.outreach_delivery_intents(id) on delete set null,
  provider_message_id text,
  message_id text,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists outreach_delivery_events_intent_idx on public.outreach_delivery_events(intent_id,occurred_at desc);
create index if not exists outreach_delivery_events_provider_message_idx on public.outreach_delivery_events(provider_message_id);
alter table public.outreach_delivery_events enable row level security;

create table if not exists public.outreach_replies (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_received_email_id text not null unique,
  provider_event_id text not null unique,
  intent_id uuid references public.outreach_delivery_intents(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  from_email text not null,
  to_emails text[] not null default '{}',
  subject text not null default '',
  text_body text,
  message_id text,
  in_reply_to text,
  reference_ids text[] not null default '{}',
  received_at timestamptz not null,
  matched_by text check (matched_by in ('in_reply_to','references','unmatched')),
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed','reviewed','not_a_reply')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outreach_replies_review_idx on public.outreach_replies(review_status,received_at desc);
create index if not exists outreach_replies_intent_idx on public.outreach_replies(intent_id,received_at desc);
alter table public.outreach_replies enable row level security;
