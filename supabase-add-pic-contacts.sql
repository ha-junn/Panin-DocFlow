-- Master PIC dan nomor WhatsApp
-- Jalankan satu kali di Supabase SQL Editor sebelum memakai
-- Pengaturan > Master PIC dan tombol Kirim WhatsApp.

create table if not exists public.pic_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_number text not null,
  department text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pic_contacts_name_not_blank check (length(trim(name)) > 0),
  constraint pic_contacts_whatsapp_not_blank
    check (length(trim(whatsapp_number)) >= 8)
);

create unique index if not exists pic_contacts_name_normalized_unique
on public.pic_contacts (lower(trim(name)));

create index if not exists pic_contacts_active_idx
on public.pic_contacts (active, name);

drop trigger if exists pic_contacts_set_updated_at on public.pic_contacts;
create trigger pic_contacts_set_updated_at
before update on public.pic_contacts
for each row execute function public.set_updated_at();

alter table public.pic_contacts enable row level security;

drop policy if exists "Authenticated users can read PIC contacts" on public.pic_contacts;
create policy "Authenticated users can read PIC contacts"
on public.pic_contacts
for select
to authenticated
using (true);

drop policy if exists "Admins can manage PIC contacts" on public.pic_contacts;
create policy "Admins can manage PIC contacts"
on public.pic_contacts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
