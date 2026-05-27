-- Panin DocFlow - Fix schema for the latest letter form
-- Run this once in Supabase SQL Editor if "Tambah Surat Masuk" fails after
-- adding nomor surat/tanggal surat or removing instansi/perusahaan pengirim.

alter table public.documents
add column if not exists letter_number text,
add column if not exists letter_date date;

alter table public.documents
alter column sender_organization drop not null;

insert into public.departments (name, code)
values
  ('General Affair', 'GA'),
  ('Human Resource Management', 'HRM')
on conflict (code) do update
set
  name = excluded.name,
  updated_at = now();

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
on conflict (name, type) do update
set
  type = excluded.type,
  updated_at = now();
