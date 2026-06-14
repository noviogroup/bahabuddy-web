create table if not exists public.travel_booking_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  product_type text not null default 'flight',
  status text not null default 'started',
  provider_booking_id text null,
  provider_booking_ref text null,
  source text not null default 'web',
  origin text null,
  destination text null,
  start_date date null,
  end_date date null,
  currency text null,
  amount numeric null,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.travel_booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid null references public.travel_booking_records(id) on delete cascade,
  event_type text not null,
  message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.travel_booking_records enable row level security;
alter table public.travel_booking_events enable row level security;

create index if not exists idx_travel_booking_records_user_id
  on public.travel_booking_records(user_id);

create index if not exists idx_travel_booking_records_status
  on public.travel_booking_records(status);

create index if not exists idx_travel_booking_records_product_type
  on public.travel_booking_records(product_type);

create index if not exists idx_travel_booking_events_booking_id
  on public.travel_booking_events(booking_id);
