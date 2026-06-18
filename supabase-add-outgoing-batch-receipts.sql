-- Tanda Terima Harian Surat Keluar
-- Jalankan satu kali di Supabase SQL Editor setelah:
-- 1. supabase-add-outgoing-letters.sql
-- 2. supabase-add-digital-receipts.sql

create table if not exists public.outgoing_receipt_batches (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  recipient_name text not null,
  recipient_unit text,
  status text not null default 'PENDING',
  confirmed_name text,
  confirmed_unit text,
  confirmed_note text,
  signature_data text,
  confirmed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outgoing_receipt_batches_status_check
    check (status in ('PENDING', 'CONFIRMED')),
  constraint outgoing_receipt_batches_recipient_check
    check (length(trim(recipient_name)) > 0)
);

create table if not exists public.outgoing_receipt_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null
    references public.outgoing_receipt_batches(id) on delete cascade,
  outgoing_letter_id uuid not null
    references public.outgoing_letters(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists outgoing_receipt_batch_items_letter_unique
on public.outgoing_receipt_batch_items (outgoing_letter_id);

create index if not exists outgoing_receipt_batches_token_idx
on public.outgoing_receipt_batches (token);

create index if not exists outgoing_receipt_batch_items_batch_idx
on public.outgoing_receipt_batch_items (batch_id);

drop trigger if exists outgoing_receipt_batches_set_updated_at
on public.outgoing_receipt_batches;
create trigger outgoing_receipt_batches_set_updated_at
before update on public.outgoing_receipt_batches
for each row execute function public.set_updated_at();

alter table public.outgoing_receipt_batches enable row level security;
alter table public.outgoing_receipt_batch_items enable row level security;

drop policy if exists "Authenticated users can read outgoing receipt batches"
on public.outgoing_receipt_batches;
create policy "Authenticated users can read outgoing receipt batches"
on public.outgoing_receipt_batches
for select to authenticated
using (true);

drop policy if exists "Authenticated users can create outgoing receipt batches"
on public.outgoing_receipt_batches;
create policy "Authenticated users can create outgoing receipt batches"
on public.outgoing_receipt_batches
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "Authenticated users can update outgoing receipt batches"
on public.outgoing_receipt_batches;
create policy "Authenticated users can update outgoing receipt batches"
on public.outgoing_receipt_batches
for update to authenticated
using (true)
with check (true);

drop policy if exists "Admins can delete outgoing receipt batches"
on public.outgoing_receipt_batches;
create policy "Admins can delete outgoing receipt batches"
on public.outgoing_receipt_batches
for delete to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can read outgoing receipt batch items"
on public.outgoing_receipt_batch_items;
create policy "Authenticated users can read outgoing receipt batch items"
on public.outgoing_receipt_batch_items
for select to authenticated
using (true);

drop policy if exists "Authenticated users can create outgoing receipt batch items"
on public.outgoing_receipt_batch_items;
create policy "Authenticated users can create outgoing receipt batch items"
on public.outgoing_receipt_batch_items
for insert to authenticated
with check (true);

drop policy if exists "Admins can delete outgoing receipt batch items"
on public.outgoing_receipt_batch_items;
create policy "Admins can delete outgoing receipt batch items"
on public.outgoing_receipt_batch_items
for delete to authenticated
using (public.is_admin());

create or replace function public.get_outgoing_receipt_batch_by_token(
  p_token uuid
)
returns table (
  batch_id uuid,
  token uuid,
  status text,
  recipient_name text,
  recipient_unit text,
  confirmed_name text,
  confirmed_unit text,
  confirmed_note text,
  signature_data text,
  created_at timestamptz,
  confirmed_at timestamptz,
  item_id uuid,
  agenda_number text,
  letter_number text,
  subject text,
  sender_staff text,
  sender_department text,
  destination_name text,
  attention_to text,
  sent_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.id,
    b.token,
    b.status,
    b.recipient_name,
    b.recipient_unit,
    b.confirmed_name,
    b.confirmed_unit,
    b.confirmed_note,
    b.signature_data,
    b.created_at,
    b.confirmed_at,
    i.id,
    o.agenda_number,
    o.letter_number,
    o.subject,
    o.sender_staff,
    o.sender_department,
    o.destination_name,
    o.attention_to,
    o.sent_at
  from public.outgoing_receipt_batches b
  join public.outgoing_receipt_batch_items i on i.batch_id = b.id
  join public.outgoing_letters o on o.id = i.outgoing_letter_id
  where b.token = p_token
  order by o.created_at desc;
$$;

create or replace function public.confirm_outgoing_receipt_batch_by_token(
  p_token uuid,
  p_confirmed_name text,
  p_confirmed_unit text default null,
  p_confirmed_note text default null,
  p_signature_data text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_batch public.outgoing_receipt_batches;
begin
  select *
  into selected_batch
  from public.outgoing_receipt_batches
  where token = p_token
  for update;

  if selected_batch.id is null then
    raise exception 'Tanda terima surat keluar tidak ditemukan.';
  end if;

  if selected_batch.status = 'CONFIRMED' then
    return;
  end if;

  if p_confirmed_name is null or length(trim(p_confirmed_name)) = 0 then
    raise exception 'Nama penerima wajib diisi.';
  end if;

  update public.outgoing_receipt_batches
  set
    status = 'CONFIRMED',
    confirmed_name = trim(p_confirmed_name),
    confirmed_unit = nullif(trim(coalesce(p_confirmed_unit, '')), ''),
    confirmed_note = nullif(trim(coalesce(p_confirmed_note, '')), ''),
    signature_data = nullif(p_signature_data, ''),
    confirmed_at = now()
  where id = selected_batch.id;
end;
$$;

grant execute on function
  public.get_outgoing_receipt_batch_by_token(uuid)
to anon, authenticated;

grant execute on function
  public.confirm_outgoing_receipt_batch_by_token(uuid, text, text, text, text)
to anon, authenticated;
