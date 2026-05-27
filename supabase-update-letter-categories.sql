-- Panin DocFlow - Update letter categories
-- Run this once in Supabase SQL Editor to add the requested letter categories
-- and remove old unused categories.

begin;

delete from public.document_categories
where type = 'LETTER'
  and name in ('Regulator', 'Undangan');

insert into public.document_categories (name, type)
values
  ('Form Pengajuan Perbaikan', 'LETTER'),
  ('Makan dan Transport', 'LETTER'),
  ('BPKU', 'LETTER'),
  ('Amplop Tertutup', 'LETTER'),
  ('Form PR', 'LETTER'),
  ('Transport Dinas', 'LETTER'),
  ('Form Lembur', 'LETTER'),
  ('Teguran Lisan', 'LETTER')
on conflict (name, type) do nothing;

commit;
