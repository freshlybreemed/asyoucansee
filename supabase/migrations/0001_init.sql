-- As You Can See: showroom rental system
-- Shopify stays the storefront; this schema tracks members, rentable pieces, and rentals.

create type relationship_tier as enum ('public', 'member', 'friend', 'family', 'comp');
create type rental_status as enum ('requested', 'confirmed', 'checked_out', 'returned', 'late', 'cancelled');

-- Profile member: one row per auth user.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  social_handle text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country text default 'US',
  tier relationship_tier not null default 'public',
  stripe_customer_id text unique,
  has_card_on_file boolean not null default false,
  sms_opt_in boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pieces mirrored from Shopify. Rental pricing fields are owned here, not in Shopify.
create table pieces (
  id uuid primary key default gen_random_uuid(),
  shopify_product_id text not null unique,
  shopify_variant_id text not null,
  shopify_inventory_item_id text not null,
  title text not null,
  vendor text,
  image_url text,
  retail_price_cents integer not null,
  daily_rate_cents integer,            -- override; null = derived from retail price
  is_rentable boolean not null default false,
  updated_at timestamptz not null default now()
);

create table rentals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id),
  piece_id uuid not null references pieces (id),
  status rental_status not null default 'requested',
  starts_on date not null,
  due_on date not null,
  returned_at timestamptz,
  quoted_cents integer not null,
  quote_breakdown jsonb not null,
  late_fee_cents integer not null default 0,
  late_fee_charged_through date,       -- last day a late fee has been billed for
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint due_after_start check (due_on >= starts_on)
);

create index rentals_piece_dates on rentals (piece_id, starts_on, due_on);
create index rentals_open on rentals (status) where status in ('checked_out', 'late');

-- Prevent double-booking a piece across overlapping active rentals.
create extension if not exists btree_gist;
alter table rentals add constraint rentals_no_overlap exclude using gist (
  piece_id with =,
  daterange(starts_on, due_on, '[]') with &&
) where (status in ('confirmed', 'checked_out', 'late'));

create table notifications (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references rentals (id) on delete set null,
  profile_id uuid references profiles (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  kind text not null,
  sent_at timestamptz not null default now(),
  error text
);

-- Row level security: members see their own data; admins use the service role.
alter table profiles enable row level security;
alter table rentals enable row level security;
alter table pieces enable row level security;
alter table notifications enable row level security;

create policy "own profile read" on profiles for select using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);
-- Members can edit contact info but not tier/admin/stripe fields (enforced by trigger below).
create policy "own profile update" on profiles for update using (auth.uid() = id);
create policy "own rentals read" on rentals for select using (auth.uid() = profile_id);
create policy "rentable pieces read" on pieces for select using (is_rentable);

create function protect_profile_fields() returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    new.tier := old.tier;
    new.is_admin := old.is_admin;
    new.stripe_customer_id := old.stripe_customer_id;
    new.has_card_on_file := old.has_card_on_file;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_protect before update on profiles
  for each row execute function protect_profile_fields();

create function protect_new_profile() returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    new.tier := 'public';
    new.is_admin := false;
    new.stripe_customer_id := null;
    new.has_card_on_file := false;
  end if;
  return new;
end $$;

create trigger profiles_protect_insert before insert on profiles
  for each row execute function protect_new_profile();
