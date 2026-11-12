-- Category group (tops, bottoms, shoes…) from Shopify's product taxonomy, for admin filters.
-- Filled in by the Shopify sync; see src/lib/catalog/categories.ts for the grouping.

alter table pieces add column category text;
create index pieces_category on pieces (category);
create index pieces_vendor on pieces (vendor);
