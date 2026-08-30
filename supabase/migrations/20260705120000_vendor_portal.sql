-- Baha Buddy — Approved Partner Vendor Portal v1
-- Purpose: controlled vendor access, pending profile/deal/photo submissions, and admin-approved public updates.
-- Non-destructive: existing partner, place, deal, and photo data is preserved.

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deal_type text not null default 'partner_offer',
  description text,
  image text,
  price_from numeric,
  cta_label text,
  cta_url text,
  source text,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  featured boolean not null default false,
  sponsored boolean not null default false,
  partner_id uuid references public.partners(id) on delete set null,
  place_id uuid references public.places(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deals add column if not exists partner_id uuid references public.partners(id) on delete set null;
alter table public.deals add column if not exists place_id uuid references public.places(id) on delete set null;
alter table public.deals add column if not exists active boolean not null default true;
alter table public.deals add column if not exists featured boolean not null default false;
alter table public.deals add column if not exists sponsored boolean not null default false;
alter table public.deals add column if not exists updated_at timestamptz not null default now();
alter table public.places add column if not exists gallery_images jsonb not null default '[]'::jsonb;

create table if not exists public.partner_users (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  invite_id uuid,
  created_by_admin_email text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, auth_user_id)
);

create table if not exists public.partner_user_invites (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'disabled', 'revoked', 'expired')),
  created_by_admin_email text,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_profile_submissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  submitted_by_email text,
  proposed_data jsonb not null default '{}'::jsonb,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_deal_submissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  submitted_by_email text,
  deal_id uuid references public.deals(id) on delete set null,
  proposed_data jsonb not null default '{}'::jsonb,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'place-gallery',
  'place-gallery',
  true,
  10485760,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

drop policy if exists "place-gallery: service role full access" on storage.objects;
create policy "place-gallery: service role full access" on storage.objects
  for all to service_role
  using (bucket_id = 'place-gallery')
  with check (bucket_id = 'place-gallery');

drop policy if exists "place-gallery: public read" on storage.objects;
create policy "place-gallery: public read" on storage.objects
  for select to public
  using (bucket_id = 'place-gallery');

create table if not exists public.partner_photo_submissions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_by_email text,
  storage_path text,
  file_name text,
  mime_type text,
  file_size integer,
  url text not null,
  alt text not null default '',
  type text not null default 'gallery' check (type in ('hero','gallery','room','food','exterior','activity','map')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_reason text
);

alter table public.partner_photo_submissions add column if not exists submitted_by uuid references auth.users(id) on delete set null;
alter table public.partner_photo_submissions add column if not exists submitted_by_email text;
alter table public.partner_photo_submissions add column if not exists storage_path text;
alter table public.partner_photo_submissions add column if not exists file_name text;
alter table public.partner_photo_submissions add column if not exists mime_type text;
alter table public.partner_photo_submissions add column if not exists file_size integer;

create index if not exists idx_deals_partner on public.deals(partner_id);
create index if not exists idx_deals_place on public.deals(place_id);
create index if not exists idx_deals_active on public.deals(active);
create index if not exists idx_partner_users_auth_status on public.partner_users(auth_user_id, status);
create index if not exists idx_partner_users_partner_status on public.partner_users(partner_id, status);
create unique index if not exists idx_partner_users_partner_email_lower
  on public.partner_users(partner_id, lower(email));
create index if not exists idx_partner_user_invites_partner_status on public.partner_user_invites(partner_id, status);
create index if not exists idx_partner_user_invites_email_lower on public.partner_user_invites(lower(email));
create unique index if not exists idx_partner_user_invites_pending_partner_email
  on public.partner_user_invites(partner_id, lower(email))
  where status = 'pending';
create index if not exists idx_partner_profile_submissions_partner_status
  on public.partner_profile_submissions(partner_id, status, created_at desc);
create index if not exists idx_partner_profile_submissions_submitter
  on public.partner_profile_submissions(submitted_by, created_at desc);
create index if not exists idx_partner_deal_submissions_partner_status
  on public.partner_deal_submissions(partner_id, status, created_at desc);
create index if not exists idx_partner_deal_submissions_submitter
  on public.partner_deal_submissions(submitted_by, created_at desc);
create index if not exists idx_partner_photos_place on public.partner_photo_submissions(place_id);
create index if not exists idx_partner_photos_partner on public.partner_photo_submissions(partner_id);
create index if not exists idx_partner_photos_status on public.partner_photo_submissions(status);
create index if not exists idx_partner_photos_submitter on public.partner_photo_submissions(submitted_by, submitted_at desc);

alter table public.deals enable row level security;
alter table public.partner_users enable row level security;
alter table public.partner_user_invites enable row level security;
alter table public.partner_profile_submissions enable row level security;
alter table public.partner_deal_submissions enable row level security;
alter table public.partner_photo_submissions enable row level security;

create or replace function public.is_active_partner_member(target_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_users pu
    where pu.partner_id = target_partner_id
      and pu.auth_user_id = (select auth.uid())
      and pu.status = 'active'
  );
$$;

grant execute on function public.is_active_partner_member(uuid) to authenticated, service_role;

drop policy if exists "Public can read active deals" on public.deals;
create policy "Public can read active deals" on public.deals
for select to anon, authenticated
using (active = true);

drop policy if exists "Service role can manage deals" on public.deals;
create policy "Service role can manage deals" on public.deals
for all to service_role
using (true)
with check (true);

drop policy if exists "Vendors can read their partner user rows" on public.partner_users;
create policy "Vendors can read their partner user rows" on public.partner_users
for select to authenticated
using (auth_user_id = (select auth.uid()));

drop policy if exists "Service role can manage partner users" on public.partner_users;
create policy "Service role can manage partner users" on public.partner_users
for all to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage partner user invites" on public.partner_user_invites;
create policy "Service role can manage partner user invites" on public.partner_user_invites
for all to service_role
using (true)
with check (true);

drop policy if exists "Vendors can read their profile submissions" on public.partner_profile_submissions;
create policy "Vendors can read their profile submissions" on public.partner_profile_submissions
for select to authenticated
using (submitted_by = (select auth.uid()) and (select public.is_active_partner_member(partner_id)));

drop policy if exists "Vendors can create profile submissions" on public.partner_profile_submissions;
create policy "Vendors can create profile submissions" on public.partner_profile_submissions
for insert to authenticated
with check (submitted_by = (select auth.uid()) and (select public.is_active_partner_member(partner_id)));

drop policy if exists "Service role can manage profile submissions" on public.partner_profile_submissions;
create policy "Service role can manage profile submissions" on public.partner_profile_submissions
for all to service_role
using (true)
with check (true);

drop policy if exists "Vendors can read their deal submissions" on public.partner_deal_submissions;
create policy "Vendors can read their deal submissions" on public.partner_deal_submissions
for select to authenticated
using (submitted_by = (select auth.uid()) and (select public.is_active_partner_member(partner_id)));

drop policy if exists "Vendors can create deal submissions" on public.partner_deal_submissions;
create policy "Vendors can create deal submissions" on public.partner_deal_submissions
for insert to authenticated
with check (submitted_by = (select auth.uid()) and (select public.is_active_partner_member(partner_id)));

drop policy if exists "Service role can manage deal submissions" on public.partner_deal_submissions;
create policy "Service role can manage deal submissions" on public.partner_deal_submissions
for all to service_role
using (true)
with check (true);

drop policy if exists "Vendors can read their photo submissions" on public.partner_photo_submissions;
create policy "Vendors can read their photo submissions" on public.partner_photo_submissions
for select to authenticated
using (submitted_by = (select auth.uid()) and (select public.is_active_partner_member(partner_id)));

drop policy if exists "Vendors can create photo submissions" on public.partner_photo_submissions;
create policy "Vendors can create photo submissions" on public.partner_photo_submissions
for insert to authenticated
with check (submitted_by = (select auth.uid()) and (select public.is_active_partner_member(partner_id)));

drop policy if exists "Service role can manage partner photos" on public.partner_photo_submissions;
create policy "Service role can manage partner photos" on public.partner_photo_submissions
for all to service_role
using (true)
with check (true);

create or replace function public.tg_partners_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_deals on public.deals;
create trigger set_updated_at_deals
before update on public.deals
for each row execute function public.tg_partners_set_updated_at();

drop trigger if exists set_updated_at_partner_users on public.partner_users;
create trigger set_updated_at_partner_users
before update on public.partner_users
for each row execute function public.tg_partners_set_updated_at();

drop trigger if exists set_updated_at_partner_user_invites on public.partner_user_invites;
create trigger set_updated_at_partner_user_invites
before update on public.partner_user_invites
for each row execute function public.tg_partners_set_updated_at();

drop trigger if exists set_updated_at_partner_profile_submissions on public.partner_profile_submissions;
create trigger set_updated_at_partner_profile_submissions
before update on public.partner_profile_submissions
for each row execute function public.tg_partners_set_updated_at();

drop trigger if exists set_updated_at_partner_deal_submissions on public.partner_deal_submissions;
create trigger set_updated_at_partner_deal_submissions
before update on public.partner_deal_submissions
for each row execute function public.tg_partners_set_updated_at();

comment on table public.partner_users is 'Approved vendor portal memberships mapping Supabase Auth users to partners.';
comment on table public.partner_user_invites is 'Admin-created vendor portal email invitations; no external email is sent automatically.';
comment on table public.partner_profile_submissions is 'Pending vendor profile updates requiring admin review before public partner data changes.';
comment on table public.partner_deal_submissions is 'Pending vendor deal proposals requiring admin review before canonical deal changes.';
comment on table public.partner_photo_submissions is 'Pending partner-submitted media for place-gallery review.';
