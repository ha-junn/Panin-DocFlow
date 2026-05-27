-- Panin DocFlow - Make invoice number and amount optional
-- Run this once in Supabase SQL Editor if your database was created before
-- invoice_number and amount became optional on the invoice form.

alter table public.invoice_details
alter column invoice_number drop not null,
alter column amount drop not null;

alter table public.invoice_details
drop constraint if exists invoice_details_invoice_number_not_blank,
drop constraint if exists invoice_details_amount_positive;

alter table public.invoice_details
add constraint invoice_details_invoice_number_not_blank
check (invoice_number is null or length(trim(invoice_number)) > 0),
add constraint invoice_details_amount_positive
check (amount is null or amount > 0);
