-- Informasi lengkap item pada Tanda Terima Gabungan.
-- Jalankan satu kali di Supabase SQL Editor.

create or replace function public.get_receipt_batch_details_by_token(
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
  target_type text,
  title text,
  sender_name text,
  item_recipient_name text,
  department_name text,
  category_name text,
  received_at timestamptz,
  letter_number text,
  letter_date date,
  subject text,
  employee_name text,
  document_amount numeric,
  invoice_number text,
  invoice_amount numeric,
  notes text
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
      when d.type = 'INVOICE' then concat_ws(
        ' - ',
        'INVOICE',
        nullif(inv.invoice_number, ''),
        d.sender_name
      )
      else coalesce(nullif(d.subject, ''), 'DOKUMEN MASUK')
    end as title,
    d.sender_name,
    coalesce(
      nullif(inv.internal_pic, ''),
      nullif(d.recipient_name, ''),
      '-'
    ) as item_recipient_name,
    dep.name as department_name,
    cat.name as category_name,
    d.received_at,
    d.letter_number,
    d.letter_date,
    d.subject,
    d.employee_name,
    d.amount as document_amount,
    inv.invoice_number,
    inv.amount as invoice_amount,
    d.notes
  from public.receipt_batches b
  join public.receipt_batch_items i on i.batch_id = b.id
  join public.documents d on d.id = i.document_id
  left join public.departments dep on dep.id = d.department_id
  left join public.document_categories cat on cat.id = d.category_id
  left join lateral (
    select
      invoice_number,
      internal_pic,
      amount
    from public.invoice_details
    where document_id = d.id
    order by created_at asc
    limit 1
  ) inv on true
  where b.token = p_token
  order by d.created_at desc;
$$;

grant execute on function
  public.get_receipt_batch_details_by_token(uuid)
to anon, authenticated;
