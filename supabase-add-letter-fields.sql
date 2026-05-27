-- Panin DocFlow - Optional letter fields migration
-- Run this once in Supabase SQL Editor if your database was created before
-- letter_number and letter_date were added to the documents table.

alter table public.documents
add column if not exists letter_number text,
add column if not exists letter_date date;
