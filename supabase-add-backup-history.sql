-- Riwayat Backup Bulanan
-- Jalankan file ini di Supabase SQL Editor sebelum memakai menu
-- Pengaturan > Riwayat Backup.

create table if not exists public.backup_histories (
  id uuid primary key default gen_random_uuid(),
  backup_month date not null,
  document_count integer not null default 0 check (document_count >= 0),
  invoice_count integer not null default 0 check (invoice_count >= 0),
  attachment_count integer not null default 0 check (attachment_count >= 0),
  status text not null default 'BACKED_UP'
    check (status in ('BACKED_UP', 'VERIFIED', 'CLEANED')),
  backup_file_name text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  cleaned_at timestamptz,
  constraint backup_histories_backup_month_unique unique (backup_month)
);

create index if not exists backup_histories_backup_month_idx
on public.backup_histories(backup_month desc);

drop trigger if exists backup_histories_set_updated_at on public.backup_histories;
create trigger backup_histories_set_updated_at
before update on public.backup_histories
for each row execute function public.set_updated_at();

alter table public.backup_histories enable row level security;

drop policy if exists "Authenticated users can read backup histories" on public.backup_histories;
create policy "Authenticated users can read backup histories"
on public.backup_histories
for select
to authenticated
using (true);

drop policy if exists "Admins can manage backup histories" on public.backup_histories;
create policy "Admins can manage backup histories"
on public.backup_histories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
