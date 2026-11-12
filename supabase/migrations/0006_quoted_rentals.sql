-- Rentals are quoted by staff from the request form instead of priced instantly by day rate.
-- Flow: requested (member's dates, occasion, budget) -> quoted (staff set the price) -> member pays -> confirmed.

alter type rental_status add value if not exists 'quoted' after 'requested';

alter table rentals
  alter column quoted_cents drop not null,
  alter column quote_breakdown drop not null,  -- now the suggested price from the pricing engine, if it could compute one
  add column occasion text,
  add column budget_cents integer,
  add column quoted_at timestamptz;
