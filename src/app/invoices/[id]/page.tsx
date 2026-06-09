import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  Paperclip,
  Pencil,
  ReceiptText,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { LoadingLink } from "@/components/LoadingLink";
import { ReceiptPanel, type ReceiptSummary } from "@/components/ReceiptPanel";
import { deleteDocumentAction } from "@/app/documents/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InvoiceDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    message?: string;
  }>;
};

type InvoiceDetail = {
  invoice_number: string | null;
  amount: number | null;
  internal_pic: string | null;
};

type InvoiceDocument = {
  id: string;
  agenda_number: string;
  type: "INVOICE";
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  notes: string | null;
  employee_name: string | null;
  amount: number | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  department: { name: string; code: string } | null;
  category: { name: string } | null;
  creator: { full_name: string } | null;
  updater: { full_name: string } | null;
  invoice_details: InvoiceDetail | InvoiceDetail[] | null;
};

type DocumentEvent = {
  id: string;
  event_type: string;
  message: string | null;
  created_at: string;
  actor: { full_name: string } | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function getInvoiceDetail(details: InvoiceDocument["invoice_details"]) {
  if (Array.isArray(details)) {
    return details[0] ?? null;
  }

  return details;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: InvoiceDetailPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { message } = await searchParams;

  const [{ data: invoice }, { data: events }, { data: receipt }] = await Promise.all([
    supabase
      .from("documents")
      .select(
        `
        id,
        agenda_number,
        type,
        received_at,
        sender_name,
        recipient_name,
        subject,
        notes,
        employee_name,
        amount,
        attachment_url,
        created_at,
        updated_at,
        department:departments(name, code),
        category:document_categories(name),
        creator:profiles!documents_created_by_fkey(full_name),
        updater:profiles!documents_updated_by_fkey(full_name),
        invoice_details(invoice_number, amount, internal_pic)
      `,
      )
      .eq("id", id)
      .eq("type", "INVOICE")
      .single(),
    supabase
      .from("document_events")
      .select(
        `
        id,
        event_type,
        message,
        created_at,
        actor:profiles(full_name)
      `,
      )
      .eq("document_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("receipt_requests")
      .select(
        "id, token, status, recipient_name, recipient_unit, recipient_note, signature_data, confirmed_at, created_at",
      )
      .eq("document_id", id)
      .maybeSingle(),
  ]);

  if (!invoice) {
    redirect("/invoices");
  }

  const detail = invoice as unknown as InvoiceDocument;
  const receiptSummary = receipt as unknown as ReceiptSummary | null;
  const invoiceDetail = getInvoiceDetail(detail.invoice_details);
  const timeline = (events ?? []) as unknown as DocumentEvent[];
  const amount = Number(invoiceDetail?.amount ?? detail.amount ?? 0);
  let attachmentUrl: string | null = null;

  if (detail.attachment_url) {
    const { data } = await supabase.storage
      .from("document-attachments")
      .createSignedUrl(detail.attachment_url, 60 * 10);

    attachmentUrl = data?.signedUrl ?? null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <LoadingLink
            href="/invoices"
            pendingLabel="Kembali..."
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#D71920]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke daftar invoice
          </LoadingLink>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="inline-flex rounded-md bg-[#D71920] px-2.5 py-1 text-xs font-semibold text-white">
                Invoice
              </span>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {detail.agenda_number}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {detail.subject}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <LoadingLink
                href={`/documents/${detail.id}/edit`}
                pendingLabel="Membuka..."
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#D71920]/30 hover:bg-red-50 hover:text-[#B9151B]"
              >
                <Pencil className="size-4" aria-hidden="true" />
                Edit Invoice
              </LoadingLink>

              <form action={deleteDocumentAction}>
                <input type="hidden" name="id" value={detail.id} />
                <input type="hidden" name="type" value="INVOICE" />
                <ConfirmSubmitButton
                  message={`Hapus invoice ${detail.agenda_number}?`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-[#B9151B] shadow-sm transition hover:bg-red-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Hapus
                </ConfirmSubmitButton>
              </form>

              {attachmentUrl ? (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#D71920] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b9151b]"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Buka Lampiran
                </a>
              ) : null}
            </div>
          </div>
        </section>

        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ReceiptText className="size-5 text-[#D71920]" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Informasi Invoice
                </h2>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <DetailItem
                  label="Tanggal diterima"
                  value={formatDate(detail.received_at)}
                />
                <DetailItem
                  label="Nomor invoice"
                  value={invoiceDetail?.invoice_number}
                />
                <DetailItem label="Vendor" value={detail.sender_name} />
                <DetailItem
                  label="PIC penerima internal"
                  value={invoiceDetail?.internal_pic ?? detail.recipient_name}
                />
                <DetailItem
                  label="Departemen"
                  value={
                    detail.department
                      ? `${detail.department.name} (${detail.department.code})`
                      : "-"
                  }
                />
                <DetailItem label="Kategori" value={detail.category?.name} />
                <DetailItem
                  label="Nominal"
                  value={amount > 0 ? currencyFormatter.format(amount) : "-"}
                />
                {detail.employee_name ? (
                  <DetailItem
                    label="Nama karyawan"
                    value={detail.employee_name}
                  />
                ) : null}
                <DetailItem label="Dibuat oleh" value={detail.creator?.full_name} />
                <DetailItem
                  label="Terakhir diubah oleh"
                  value={detail.updater?.full_name}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">Catatan</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {detail.notes || "Tidak ada catatan."}
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <ReceiptPanel
              receipt={receiptSummary}
              targetType="INVOICE"
              targetId={detail.id}
              returnTo={`/invoices/${detail.id}`}
              accentClassName="text-[#D71920]"
            />

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Paperclip className="size-5 text-[#D71920]" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Lampiran
                </h2>
              </div>
              {attachmentUrl ? (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#D71920]/30 hover:bg-red-50 hover:text-[#B9151B]"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Lihat lampiran
                </a>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Invoice ini belum memiliki lampiran.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-5 text-[#D71920]" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Timeline Aktivitas
                </h2>
              </div>

              {timeline.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="border-l-2 border-red-100 pl-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {event.message || event.event_type}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(event.created_at)} oleh{" "}
                        {event.actor?.full_name ?? "Sistem"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Belum ada aktivitas untuk invoice ini.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UserRound className="size-5 text-[#D71920]" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Metadata
                </h2>
              </div>
              <div className="mt-5 space-y-4">
                <DetailItem label="Dibuat" value={formatDate(detail.created_at)} />
                <DetailItem
                  label="Terakhir diubah"
                  value={formatDate(detail.updated_at)}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
