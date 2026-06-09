-- Run this after supabase-add-digital-receipts.sql if you already installed
-- the digital receipt feature before admin-only reset was added.

drop policy if exists "Authenticated users can delete receipt requests" on public.receipt_requests;
drop policy if exists "Admins can delete receipt requests" on public.receipt_requests;

create policy "Admins can delete receipt requests"
on public.receipt_requests
for delete
to authenticated
using (public.is_admin());
