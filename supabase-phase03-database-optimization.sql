-- Panin DocFlow - Phase 03 Database Optimization
-- Run once in Supabase SQL Editor after Phase 02 P0 fixes.
--
-- This migration is intentionally non-destructive:
-- - no DROP TABLE / TRUNCATE
-- - no data rewrite
-- - constraints added as NOT VALID where existing production data may need review
-- - duplicate invoice-number normalization is checked before adding the unique index

do $$
begin
  if exists (
    select 1
    from public.invoice_details
    where invoice_number is not null
    group by lower(trim(invoice_number))
    having count(*) > 1
  ) then
    raise exception
      'Duplicate normalized invoice_number values found. Resolve duplicate invoice numbers before running Phase 03 migration.';
  end if;
end $$;

begin;

create extension if not exists pg_trgm;

-- =========================
-- Documents / invoices
-- =========================

create index if not exists documents_created_at_idx
on public.documents (created_at desc);

create index if not exists documents_type_created_at_idx
on public.documents (type, created_at desc);

create index if not exists documents_type_sender_name_idx
on public.documents (type, sender_name);

create index if not exists documents_department_received_at_idx
on public.documents (department_id, received_at desc);

create index if not exists documents_category_received_at_idx
on public.documents (category_id, received_at desc);

create index if not exists documents_attachment_url_idx
on public.documents (attachment_url)
where attachment_url is not null;

create index if not exists documents_agenda_number_trgm_idx
on public.documents using gin (agenda_number gin_trgm_ops);

create index if not exists documents_sender_name_trgm_idx
on public.documents using gin (sender_name gin_trgm_ops);

create index if not exists documents_recipient_name_trgm_idx
on public.documents using gin (recipient_name gin_trgm_ops)
where recipient_name is not null;

create index if not exists documents_employee_name_trgm_idx
on public.documents using gin (employee_name gin_trgm_ops)
where employee_name is not null;

create index if not exists documents_subject_trgm_idx
on public.documents using gin (subject gin_trgm_ops);

create unique index if not exists invoice_details_invoice_number_normalized_unique
on public.invoice_details (lower(trim(invoice_number)))
where invoice_number is not null;

create index if not exists invoice_details_internal_pic_idx
on public.invoice_details (internal_pic);

create index if not exists invoice_details_invoice_number_trgm_idx
on public.invoice_details using gin (invoice_number gin_trgm_ops)
where invoice_number is not null;

create index if not exists invoice_details_internal_pic_trgm_idx
on public.invoice_details using gin (internal_pic gin_trgm_ops);

create index if not exists document_events_document_created_at_idx
on public.document_events (document_id, created_at desc);

-- =========================
-- Outgoing letters
-- =========================

create index if not exists outgoing_letters_sender_department_created_at_idx
on public.outgoing_letters (sender_department, created_at desc);

create index if not exists outgoing_letters_attachment_url_idx
on public.outgoing_letters (attachment_url)
where attachment_url is not null;

create index if not exists outgoing_letters_agenda_number_trgm_idx
on public.outgoing_letters using gin (agenda_number gin_trgm_ops)
where agenda_number is not null;

create index if not exists outgoing_letters_sender_staff_trgm_idx
on public.outgoing_letters using gin (sender_staff gin_trgm_ops);

create index if not exists outgoing_letters_sender_department_trgm_idx
on public.outgoing_letters using gin (sender_department gin_trgm_ops);

create index if not exists outgoing_letters_letter_number_trgm_idx
on public.outgoing_letters using gin (letter_number gin_trgm_ops)
where letter_number is not null;

create index if not exists outgoing_letters_destination_name_trgm_idx
on public.outgoing_letters using gin (destination_name gin_trgm_ops);

create index if not exists outgoing_letters_attention_to_trgm_idx
on public.outgoing_letters using gin (attention_to gin_trgm_ops)
where attention_to is not null;

create index if not exists outgoing_letters_subject_trgm_idx
on public.outgoing_letters using gin (subject gin_trgm_ops)
where subject is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'outgoing_letters_sender_staff_not_blank'
      and conrelid = 'public.outgoing_letters'::regclass
  ) then
    alter table public.outgoing_letters
      add constraint outgoing_letters_sender_staff_not_blank
      check (length(trim(sender_staff)) > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'outgoing_letters_destination_name_not_blank'
      and conrelid = 'public.outgoing_letters'::regclass
  ) then
    alter table public.outgoing_letters
      add constraint outgoing_letters_destination_name_not_blank
      check (length(trim(destination_name)) > 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'outgoing_letters_agenda_number_not_blank'
      and conrelid = 'public.outgoing_letters'::regclass
  ) then
    alter table public.outgoing_letters
      add constraint outgoing_letters_agenda_number_not_blank
      check (agenda_number is null or length(trim(agenda_number)) > 0) not valid;
  end if;
end $$;

-- =========================
-- Receipt / batch tables
-- =========================

create index if not exists receipt_requests_created_at_idx
on public.receipt_requests (created_at desc);

create index if not exists receipt_requests_status_created_at_idx
on public.receipt_requests (status, created_at desc);

create index if not exists receipt_requests_document_status_idx
on public.receipt_requests (document_id, status)
where document_id is not null;

create index if not exists receipt_requests_outgoing_status_idx
on public.receipt_requests (outgoing_letter_id, status)
where outgoing_letter_id is not null;

create index if not exists receipt_batches_created_at_idx
on public.receipt_batches (created_at desc);

create index if not exists receipt_batches_status_created_at_idx
on public.receipt_batches (status, created_at desc);

create index if not exists receipt_batches_created_by_created_at_idx
on public.receipt_batches (created_by, created_at desc)
where created_by is not null;

create index if not exists receipt_batch_items_document_idx
on public.receipt_batch_items (document_id);

create index if not exists outgoing_receipt_batches_created_at_idx
on public.outgoing_receipt_batches (created_at desc);

create index if not exists outgoing_receipt_batches_status_created_at_idx
on public.outgoing_receipt_batches (status, created_at desc);

create index if not exists outgoing_receipt_batches_created_by_created_at_idx
on public.outgoing_receipt_batches (created_by, created_at desc)
where created_by is not null;

create index if not exists outgoing_receipt_batch_items_letter_idx
on public.outgoing_receipt_batch_items (outgoing_letter_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'receipt_requests_signature_data_check'
      and conrelid = 'public.receipt_requests'::regclass
  ) then
    alter table public.receipt_requests
      add constraint receipt_requests_signature_data_check
      check (
        signature_data is null
        or (
          length(signature_data) <= 300000
          and signature_data ~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'receipt_batches_signature_data_check'
      and conrelid = 'public.receipt_batches'::regclass
  ) then
    alter table public.receipt_batches
      add constraint receipt_batches_signature_data_check
      check (
        signature_data is null
        or (
          length(signature_data) <= 300000
          and signature_data ~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'outgoing_receipt_batches_signature_data_check'
      and conrelid = 'public.outgoing_receipt_batches'::regclass
  ) then
    alter table public.outgoing_receipt_batches
      add constraint outgoing_receipt_batches_signature_data_check
      check (
        signature_data is null
        or (
          length(signature_data) <= 300000
          and signature_data ~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
        )
      ) not valid;
  end if;
end $$;

-- =========================
-- Backup histories
-- =========================

create index if not exists backup_histories_status_backup_month_idx
on public.backup_histories (status, backup_month desc);

-- =========================
-- Master-data usage counts
-- =========================

create or replace function public.get_department_usage_counts()
returns table (
  department_id uuid,
  document_count bigint
)
language sql
stable
set search_path = public
as $$
  select d.department_id, count(*) as document_count
  from public.documents d
  group by d.department_id;
$$;

create or replace function public.get_category_usage_counts()
returns table (
  category_id uuid,
  document_count bigint
)
language sql
stable
set search_path = public
as $$
  select d.category_id, count(*) as document_count
  from public.documents d
  group by d.category_id;
$$;

-- =========================
-- Dashboard RPC timezone accuracy
-- =========================

create or replace function public.get_dashboard_summary()
returns table (
  letter_today bigint,
  invoice_today bigint,
  documents_this_month bigint,
  documents_in_progress bigint,
  documents_new bigint,
  documents_done bigint,
  documents_archived bigint
)
language sql
stable
set search_path = public
as $$
  with bounds as (
    select
      (date_trunc('day', timezone('Asia/Jakarta', now())) at time zone 'Asia/Jakarta') as today_start,
      ((date_trunc('day', timezone('Asia/Jakarta', now())) + interval '1 day') at time zone 'Asia/Jakarta') as tomorrow_start,
      (date_trunc('month', timezone('Asia/Jakarta', now())) at time zone 'Asia/Jakarta') as month_start,
      ((date_trunc('month', timezone('Asia/Jakarta', now())) + interval '1 month') at time zone 'Asia/Jakarta') as next_month_start
  )
  select
    count(*) filter (
      where d.type = 'LETTER'
        and d.received_at >= b.today_start
        and d.received_at < b.tomorrow_start
    ) as letter_today,
    count(*) filter (
      where d.type = 'INVOICE'
        and d.received_at >= b.today_start
        and d.received_at < b.tomorrow_start
    ) as invoice_today,
    count(*) filter (
      where d.received_at >= b.month_start
        and d.received_at < b.next_month_start
    ) as documents_this_month,
    count(*) filter (where d.status = 'DIPROSES') as documents_in_progress,
    count(*) filter (where d.status = 'BARU') as documents_new,
    count(*) filter (where d.status = 'SELESAI') as documents_done,
    count(*) filter (where d.status = 'DIARSIPKAN') as documents_archived
  from public.documents d
  cross join bounds b;
$$;

create or replace function public.get_weekly_document_trend()
returns table (
  day date,
  letter_count bigint,
  invoice_count bigint
)
language sql
stable
set search_path = public
as $$
  with days as (
    select generate_series(
      (timezone('Asia/Jakarta', now())::date - 6)::timestamp,
      timezone('Asia/Jakarta', now())::date::timestamp,
      interval '1 day'
    )::date as day
  )
  select
    days.day,
    count(d.id) filter (where d.type = 'LETTER') as letter_count,
    count(d.id) filter (where d.type = 'INVOICE') as invoice_count
  from days
  left join public.documents d
    on d.received_at >= (days.day::timestamp at time zone 'Asia/Jakarta')
    and d.received_at < ((days.day + 1)::timestamp at time zone 'Asia/Jakarta')
  group by days.day
  order by days.day;
$$;

grant execute on function public.get_dashboard_summary() to authenticated;
grant execute on function public.get_weekly_document_trend() to authenticated;
grant execute on function public.get_department_usage_counts() to authenticated;
grant execute on function public.get_category_usage_counts() to authenticated;

commit;
