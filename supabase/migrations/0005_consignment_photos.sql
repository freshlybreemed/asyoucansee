-- Consignment photos live in a private bucket. Sellers upload through server-issued signed URLs;
-- admins view them through short-lived signed links. No storage policies: only the service role reads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('consignments', 'consignments', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

alter table consignments add column photo_paths text[] not null default '{}';
