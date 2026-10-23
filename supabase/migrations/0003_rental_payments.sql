-- Track rental payment whether it's charged through Stripe or collected in the showroom.

create type payment_method as enum ('stripe', 'in_person', 'comp');

alter table rentals
  add column paid_cents integer not null default 0,
  add column paid_at timestamptz,
  add column payment_method payment_method,
  add column late_fees_paid_cents integer not null default 0,
  add column checked_out_at timestamptz;
