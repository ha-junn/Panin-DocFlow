import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileText,
  Paperclip,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { LoadingLink } from "@/components/LoadingLink";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteDocumentAction } from "../actions";

type DetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    message?: string;
  }>;
};

type DbDocumentType = "LETTER" | "INVOICE";

type DocumentDetail = {
  id: string;
  agenda_number: string;
  type: DbDocumentType;
  letter_number: string | null;
  letter_date: string | null;
  received_at: string;
  sender_name: string;
  recipient_name: string | null;
  subject: string;
  employee_name: string | null;
  amount: number | null;
  notes: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  department: { name: string; code: string } | null;
  category: { name: string } | null;
  creator: { full_name: string } | null;
  updater: { full_name: string } | null;
  invoice_details: {
    invoice_number: string;
    amount: number;
    internal_pic: string;
  }[] | null;
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

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : null;
}

function formatRequiredDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatCurrency(value: number | null) {
  return value ? currencyFormatter.format(value) : null;
}

function formatDocumentType(type: DbDocumentType) {
  return type === "INVOICE" ? "Invoice" : "Surat";
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

export default async function DocumentDetailPage({
  params,
  searchParams,
}: DetailPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { message } = await searchParams;

  const [{ data: document }, { data: events }] = await Promise.all([
      supabase
        .from("documents")
        .select(
          `
          id,
          agenda_number,
          type,
          letter_number,
          letter_date,
          received_at,
          sender_name,
          recipient_name,
          subject,
          employee_name,
          amount,
          notes,
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
    ]);

  if (!document) {
    redirect("/");
  }

  const detail = document as unknown as DocumentDetail;

  if (detail.type === "INVOICE") {
    redirect(`/invoices/${detail.id}`);
  }

  let attachmentUrl: string | null = null;

  if (detail.attachment_url) {
    const { data } = await supabase.storage
      .from("document-attachments")
      .createSignedUrl(detail.attachment_url, 60 * 10);

    attachmentUrl = data?.signedUrl ?? null;
  }

  const timeline = (events ?? []) as unknown as DocumentEvent[];

  return (
    <AppLayout>
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <LoadingLink
            href="/"
            pendingLabel="Kembali..."
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0A3A60]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke dashboard
          </LoadingLink>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-md bg-[#0A3A60] px-2.5 py-1 text-xs font-semibold text-white">
                  {formatDocumentType(detail.type)}
                </span>
              </div>
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
              >
                <Pencil className="size-4" aria-hidden="true" />
                Edit Dokumen
              </LoadingLink>

              <form action={deleteDocumentAction}>
                <input type="hidden" name="id" value={detail.id} />
                <input type="hidden" name="type" value="LETTER" />
                <ConfirmSubmitButton
                  message={`Hapus dokumen ${detail.agenda_number}?`}
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
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
                <FileText className="size-5 text-[#0A3A60]" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Informasi Dokumen
                </h2>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <DetailItem
                  label="Tanggal diterima"
                  value={formatRequiredDate(detail.received_at)}
                />
                <DetailItem label="Nomor surat" value={detail.letter_number} />
                <DetailItem
                  label="Tanggal surat"
                  value={formatDate(detail.letter_date)}
                />
                <DetailItem label="Kategori" value={detail.category?.name} />
                <DetailItem label="Perihal" value={detail.subject} />
                <DetailItem label="Nama karyawan" value={detail.employee_name} />
                <DetailItem label="Total" value={formatCurrency(detail.amount)} />
                <DetailItem label="Pengirim" value={detail.sender_name} />
                <DetailItem label="Ditujukan kepada" value={detail.recipient_name} />
                <DetailItem
                  label="Departemen"
                  value={
                    detail.department
                      ? `${detail.department.name} (${detail.department.code})`
                      : "-"
                  }
                />
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
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Paperclip className="size-5 text-[#0A3A60]" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Lampiran
                </h2>
              </div>
              {attachmentUrl ? (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#0A3A60]/30 hover:bg-slate-50"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Lihat lampiran
                </a>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Dokumen ini belum memiliki lampiran.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-5 text-[#0A3A60]" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Timeline Aktivitas
                </h2>
              </div>

              {timeline.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="border-l-2 border-slate-200 pl-4">
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
                  Belum ada aktivitas untuk dokumen ini.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UserRound className="size-5 text-[#0A3A60]" />
                <h2 className="text-sm font-semibold text-slate-950">
                  Metadata
                </h2>
              </div>
              <div className="mt-5 space-y-4">
                <DetailItem
                  label="Dibuat"
                  value={formatRequiredDate(detail.created_at)}
                />
                <DetailItem
                  label="Terakhir diubah"
                  value={formatRequiredDate(detail.updated_at)}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
