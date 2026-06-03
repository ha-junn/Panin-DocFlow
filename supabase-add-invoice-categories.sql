-- Panin DocFlow - Add invoice categories
-- Run this once in Supabase SQL Editor if the categories are not visible yet.

begin;

insert into public.document_categories (name, type)
values
  ('Nota Pemindahan (NP)', 'INVOICE')
on conflict (name, type) do nothing;

commit;
