-- KotakSurat / Panin DocFlow - Batch Digital Receipts
-- Run this once in Supabase SQL Editor after supabase-add-digital-receipts.sql.

create table if not exists public.receipt_batches (
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
  constraint receipt_batches_status_check
    check (status in ('PENDING', 'CONFIRMED')),
  constraint receipt_batches_recipient_name_check
    check (length(trim(recipient_name)) > 0)
);

create table if not exists public.receipt_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.receipt_batches(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists receipt_batch_items_document_unique
on public.receipt_batch_items (document_id);

create index if not exists receipt_batches_token_idx
on public.receipt_batches (token);

create index if not exists receipt_batches_status_idx
on public.receipt_batches (status);

create index if not exists receipt_batch_items_batch_idx
on public.receipt_batch_items (batch_id);

create or replace function public.set_receipt_batch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists receipt_batches_set_updated_at on public.receipt_batches;
create trigger receipt_batches_set_updated_at
before update on public.receipt_batches
for each row execute function public.set_receipt_batch_updated_at();

alter table public.receipt_batches enable row level security;
alter table public.receipt_batch_items enable row level security;

drop policy if exists "Authenticated users can read receipt batches" on public.receipt_batches;
create policy "Authenticated users can read receipt batches"
on public.receipt_batches
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create receipt batches" on public.receipt_batches;
create policy "Authenticated users can create receipt batches"
on public.receipt_batches
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Authenticated users can update receipt batches" on public.receipt_batches;
drop policy if exists "Admins and creators can update receipt batches" on public.receipt_batches;
create policy "Admins and creators can update receipt batches"
on public.receipt_batches
for update
to authenticated
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

drop policy if exists "Admins can delete receipt batches" on public.receipt_batches;
drop policy if exists "Admins and creators can delete pending receipt batches" on public.receipt_batches;
create policy "Admins and creators can delete pending receipt batches"
on public.receipt_batches
for delete
to authenticated
using (public.is_admin() or (created_by = auth.uid() and status = 'PENDING'));

drop policy if exists "Authenticated users can read receipt batch items" on public.receipt_batch_items;
create policy "Authenticated users can read receipt batch items"
on public.receipt_batch_items
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create receipt batch items" on public.receipt_batch_items;
create policy "Authenticated users can create receipt batch items"
on public.receipt_batch_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.receipt_batches b
    where b.id = receipt_batch_items.batch_id
      and b.created_by = auth.uid()
      and b.status = 'PENDING'
  )
);

drop policy if exists "Admins can delete receipt batch items" on public.receipt_batch_items;
create policy "Admins can delete receipt batch items"
on public.receipt_batch_items
for delete
to authenticated
using (public.is_admin());

create or replace function public.get_receipt_batch_by_token(p_token uuid)
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
  target_type text,
  title text,
  sender_name text,
  item_recipient_name text,
  department_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.id as batch_id,
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
    i.id as item_id,
    d.agenda_number,
    case when d.type = 'INVOICE' then 'INVOICE' else 'DOCUMENT' end as target_type,
    case
      when d.type = 'INVOICE' then concat_ws(' - ', 'Invoice', nullif(inv.invoice_number, ''), d.sender_name)
      else coalesce(nullif(d.subject, ''), 'Dokumen masuk')
    end as title,
    d.sender_name,
    coalesce(nullif(inv.internal_pic, ''), nullif(d.recipient_name, ''), '-') as item_recipient_name,
    dep.name as department_name
  from public.receipt_batches b
  join public.receipt_batch_items i on i.batch_id = b.id
  join public.documents d on d.id = i.document_id
  left join public.departments dep on dep.id = d.department_id
  left join lateral (
    select invoice_number, internal_pic
    from public.invoice_details
    where document_id = d.id
    order by created_at asc
    limit 1
  ) inv on true
  where b.token = p_token
  order by d.created_at desc;
$$;

create or replace function public.confirm_receipt_batch_by_token(
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
  selected_batch public.receipt_batches;
begin
  select *
  into selected_batch
  from public.receipt_batches
  where token = p_token
  for update;

  if selected_batch.id is null then
    raise exception 'Tanda terima gabungan tidak ditemukan.';
  end if;

  if selected_batch.status = 'CONFIRMED' then
    return;
  end if;

  if p_confirmed_name is null or length(trim(p_confirmed_name)) = 0 then
    raise exception 'Nama penerima wajib diisi.';
  end if;

  if p_signature_data is not null
    and (
      length(p_signature_data) > 300000
      or p_signature_data !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
    )
  then
    raise exception 'Format tanda tangan tidak valid.';
  end if;

  update public.receipt_batches
  set
    status = 'CONFIRMED',
    confirmed_name = trim(p_confirmed_name),
    confirmed_unit = nullif(trim(coalesce(p_confirmed_unit, '')), ''),
    confirmed_note = nullif(trim(coalesce(p_confirmed_note, '')), ''),
    signature_data = nullif(p_signature_data, ''),
    confirmed_at = now()
  where id = selected_batch.id;

  insert into public.document_events (
    document_id,
    actor_id,
    event_type,
    message
  )
  select
    item.document_id,
    null,
    'UPDATED',
    'Tanda terima gabungan dikonfirmasi oleh ' || trim(p_confirmed_name) || '.'
  from public.receipt_batch_items item
  where item.batch_id = selected_batch.id;
end;
$$;

grant execute on function public.get_receipt_batch_by_token(uuid) to anon, authenticated;
grant execute on function public.confirm_receipt_batch_by_token(uuid, text, text, text, text) to anon, authenticated;
