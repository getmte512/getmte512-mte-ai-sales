create table if not exists public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','sales')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_user_roles enable row level security;
insert into public.app_user_roles(user_id,role)
select id,'admin' from auth.users order by created_at asc limit 1
on conflict (user_id) do nothing;
