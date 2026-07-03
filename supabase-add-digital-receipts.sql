-- Panin DocFlow - Digital Receipt MVP
-- Run this once in Supabase SQL Editor before using the digital receipt feature.

create table if not exists public.receipt_requests (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  target_type text not null,
  document_id uuid references public.documents(id) on delete cascade,
  outgoing_letter_id uuid references public.outgoing_letters(id) on delete cascade,
  status text not null default 'PENDING',
  recipient_name text,
  recipient_unit text,
  recipient_note text,
  signature_data text,
  confirmed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipt_requests_target_type_check
    check (target_type in ('DOCUMENT', 'INVOICE', 'OUTGOING')),
  constraint receipt_requests_status_check
    check (status in ('PENDING', 'CONFIRMED')),
  constraint receipt_requests_target_check
    check (
      (target_type in ('DOCUMENT', 'INVOICE') and document_id is not null and outgoing_letter_id is null)
      or
      (target_type = 'OUTGOING' and outgoing_letter_id is not null and document_id is null)
    ),
  constraint receipt_requests_recipient_name_check
    check (recipient_name is null or length(trim(recipient_name)) > 0)
);

create unique index if not exists receipt_requests_document_unique
on public.receipt_requests (document_id)
where document_id is not null;

create unique index if not exists receipt_requests_outgoing_unique
on public.receipt_requests (outgoing_letter_id)
where outgoing_letter_id is not null;

create index if not exists receipt_requests_token_idx
on public.receipt_requests (token);

create index if not exists receipt_requests_status_idx
on public.receipt_requests (status);

create or replace function public.set_receipt_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists receipt_requests_set_updated_at on public.receipt_requests;
create trigger receipt_requests_set_updated_at
before update on public.receipt_requests
for each row execute function public.set_receipt_request_updated_at();

alter table public.receipt_requests enable row level security;

drop policy if exists "Authenticated users can read receipt requests" on public.receipt_requests;
create policy "Authenticated users can read receipt requests"
on public.receipt_requests
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create receipt requests" on public.receipt_requests;
create policy "Authenticated users can create receipt requests"
on public.receipt_requests
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Authenticated users can update receipt requests" on public.receipt_requests;
drop policy if exists "Admins and creators can update receipt requests" on public.receipt_requests;
create policy "Admins and creators can update receipt requests"
on public.receipt_requests
for update
to authenticated
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

drop policy if exists "Authenticated users can delete receipt requests" on public.receipt_requests;
create policy "Admins can delete receipt requests"
on public.receipt_requests
for delete
to authenticated
using (public.is_admin());

create or replace function public.get_receipt_by_token(p_token uuid)
returns table (
  receipt_id uuid,
  target_type text,
  status text,
  agenda_number text,
  title text,
  sender_name text,
  recipient_name text,
  department_name text,
  confirmed_name text,
  confirmed_unit text,
  confirmed_note text,
  signature_data text,
  created_at timestamptz,
  confirmed_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id as receipt_id,
    r.target_type,
    r.status,
    coalesce(d.agenda_number, o.agenda_number) as agenda_number,
    case
      when r.target_type = 'OUTGOING' then coalesce(o.subject, o.destination_name)
      when r.target_type = 'INVOICE' then coalesce(d.subject, 'Invoice masuk')
      else coalesce(d.subject, 'Dokumen masuk')
    end as title,
    coalesce(d.sender_name, o.sender_staff) as sender_name,
    case
      when r.target_type = 'OUTGOING' then o.destination_name
      else d.recipient_name
    end as recipient_name,
    case
      when r.target_type = 'OUTGOING' then o.sender_department
      else dep.name
    end as department_name,
    r.recipient_name as confirmed_name,
    r.recipient_unit as confirmed_unit,
    r.recipient_note as confirmed_note,
    r.signature_data,
    r.created_at,
    r.confirmed_at
  from public.receipt_requests r
  left join public.documents d on d.id = r.document_id
  left join public.departments dep on dep.id = d.department_id
  left join public.outgoing_letters o on o.id = r.outgoing_letter_id
  where r.token = p_token
  limit 1;
$$;

create or replace function public.confirm_receipt_by_token(
  p_token uuid,
  p_recipient_name text,
  p_recipient_unit text default null,
  p_recipient_note text default null,
  p_signature_data text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_receipt public.receipt_requests;
begin
  select *
  into selected_receipt
  from public.receipt_requests
  where token = p_token
  for update;

  if selected_receipt.id is null then
    raise exception 'Tanda terima tidak ditemukan.';
  end if;

  if selected_receipt.status = 'CONFIRMED' then
    return;
  end if;

  if p_recipient_name is null or length(trim(p_recipient_name)) = 0 then
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

  update public.receipt_requests
  set
    status = 'CONFIRMED',
    recipient_name = trim(p_recipient_name),
    recipient_unit = nullif(trim(coalesce(p_recipient_unit, '')), ''),
    recipient_note = nullif(trim(coalesce(p_recipient_note, '')), ''),
    signature_data = nullif(p_signature_data, ''),
    confirmed_at = now()
  where id = selected_receipt.id;

  if selected_receipt.document_id is not null then
    insert into public.document_events (
      document_id,
      actor_id,
      event_type,
      message
    )
    values (
      selected_receipt.document_id,
      null,
      'UPDATED',
      'Tanda terima dikonfirmasi oleh ' || trim(p_recipient_name) || '.'
    );
  end if;
end;
$$;

grant execute on function public.get_receipt_by_token(uuid) to anon, authenticated;
grant execute on function public.confirm_receipt_by_token(uuid, text, text, text, text) to anon, authenticated;
