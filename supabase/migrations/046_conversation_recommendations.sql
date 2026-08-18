create table if not exists public.conversation_recommendations (
  id uuid primary key default gen_random_uuid(),
  reply_id uuid not null unique references public.outreach_replies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  intent_label text not null check (intent_label in ('interested','sample_request','pricing_question','reorder_interest','not_interested','out_of_office','needs_human_review')),
  confidence text not null check (confidence in ('low','medium','high')),
  summary text not null,
  suggested_next_action text not null,
  suggested_pipeline_stage text check (suggested_pipeline_stage in ('prospect','contacted','sample_planned','sample_sent','follow_up_due','ordered','not_interested')),
  response_subject text,
  response_body text,
  model text not null,
  status text not null default 'pending' check (status in ('pending','accepted','dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversation_recommendations_status_idx on public.conversation_recommendations(status,created_at desc);
alter table public.conversation_recommendations enable row level security;
