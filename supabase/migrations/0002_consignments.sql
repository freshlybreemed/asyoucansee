-- "Sell With Us" consignment submissions. Written by the server (service role) only.

create type consignment_status as enum ('new', 'reviewing', 'accepted', 'declined', 'received', 'listed', 'paid_out');

create table consignments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  social_handle text,
  city text,
  designers text not null,
  items text not null,
  estimated_value text,
  photos_url text,
  status consignment_status not null default 'new',
  internal_notes text,
  created_at timestamptz not null default now()
);

alter table consignments enable row level security;
-- No policies: members can't read submissions; the server uses the service role.
