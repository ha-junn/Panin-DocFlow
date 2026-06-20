import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ClipboardSignature,
  FileCheck2,
  Files,
  Landmark,
} from "lucide-react";
import { confirmBatchReceiptAction } from "@/app/receipts/actions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { PrintButton } from "@/components/PrintButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignaturePad } from "../../receipt/[token]/SignaturePad";

type BatchReceiptPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string; message?: string }>;
};

type PublicBatchItem = {
  batch_id: string;
  token: string;
  status: "PENDING" | "CONFIRMED";
  recipient_name: string;
  recipient_unit: string | null;
  confirmed_name: string | null;
  confirmed_unit: string | null;
  confirmed_note: string | null;
  signature_data: string | null;
  created_at: string;
  confirmed_at: string | null;
  item_id: string;
  agenda_number: string;
  target_type: "DOCUMENT" | "INVOICE";
  title: string | null;
  sender_name: string | null;
  item_recipient_name: string | null;
  department_name: string | null;
  category_name?: string | null;
  received_at?: string | null;
  letter_number?: string | null;
  letter_date?: string | null;
  subject?: string | null;
  employee_name?: string | null;
  document_amount?: number | null;
  invoice_number?: string | null;
  invoice_amount?: number | null;
  notes?: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "-";
}

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

function formatDate(value: string | null | undefined) {
  return value ? dateFormatter.format(new Date(value)) : "-";
}

function formatCurrency(value: number | null | undefined) {
  return value ? currencyFormatter.format(value) : "-";
}

function ItemDetail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-xl rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-red-50 text-[#D71920]">
            <ClipboardSignature className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">
              Tanda terima gabungan
            </p>
            <h1 className="text-xl font-semibold">Link tidak bisa dibuka</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{message}</p>
      </section>
    </main>
  );
}

export default async function BatchReceiptPage({
  params,
  searchParams,
}: BatchReceiptPageProps) {
  const { token } = await params;
  const { confirmed, message } = await searchParams;

  if (!uuidPattern.test(token)) {
    return <ErrorCard message="Token tanda terima gabungan tidak valid." />;
  }

  const supabase = await createSupabaseServerClient();
  const detailedResult = await supabase.rpc(
    "get_receipt_batch_details_by_token",
    { p_token: token },
  );
  const fallbackResult = detailedResult.error
    ? await supabase.rpc("get_receipt_batch_by_token", { p_token: token })
    : null;
  const data = detailedResult.error ? fallbackResult?.data : detailedResult.data;
  const error = detailedResult.error ? fallbackResult?.error : detailedResult.error;

  if (error) {
    return (
      <ErrorCard message="Tanda terima gabungan belum aktif. Jalankan file supabase-add-batch-receipts.sql di Supabase SQL Editor." />
    );
  }

  const items = (Array.isArray(data) ? data : []) as PublicBatchItem[];
  const batch = items[0];

  if (!batch) {
    return <ErrorCard message="Data tanda terima gabungan tidak ditemukan." />;
  }

  if (confirmed === "1") {
    redirect(`/receipt-batch/${token}`);
  }

  const isConfirmed = batch.status === "CONFIRMED";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:py-10">
      <section className="mx-auto max-w-3xl space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#0A3A60] text-white">
              <Landmark className="size-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                KotakSurat
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Tanda Terima Gabungan
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Satu konfirmasi untuk beberapa dokumen atau invoice yang
                diterima oleh PIC yang sama.
              </p>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-[#B9151B]">
            {message}
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-[#0A3A60]">
                <Files className="size-3.5" aria-hidden="true" />
                {items.length} item
              </span>
              <h2 className="mt-4 text-2xl font-semibold">
                Untuk {batch.recipient_name}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {batch.recipient_unit || "Unit penerima belum ditentukan"}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                isConfirmed
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {isConfirmed ? "Sudah diterima" : "Menunggu konfirmasi"}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <div className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <div
                  key={item.item_id}
                  className="bg-white px-4 py-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {item.agenda_number}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {item.subject || item.title || "-"}
                          </p>
                        </div>
                        <span
                          className={[
                            "h-fit rounded-md px-2.5 py-1 text-xs font-semibold",
                            item.target_type === "INVOICE"
                              ? "bg-red-50 text-red-700"
                              : "bg-sky-50 text-[#0A3A60]",
                          ].join(" ")}
                        >
                          {item.target_type === "INVOICE"
                            ? "Invoice"
                            : "Dokumen"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                        <ItemDetail
                          label="Tanggal diterima"
                          value={formatDate(item.received_at)}
                        />
                        <ItemDetail
                          label={
                            item.target_type === "INVOICE"
                              ? "Nomor invoice"
                              : "Nomor surat"
                          }
                          value={
                            item.target_type === "INVOICE"
                              ? item.invoice_number
                              : item.letter_number
                          }
                        />
                        <ItemDetail
                          label="Pengirim / vendor"
                          value={item.sender_name}
                        />
                        <ItemDetail
                          label="PIC penerima"
                          value={item.item_recipient_name}
                        />
                        <ItemDetail
                          label="Departemen"
                          value={item.department_name}
                        />
                        <ItemDetail
                          label="Kategori"
                          value={item.category_name}
                        />
                        {item.target_type === "INVOICE" ? (
                          <ItemDetail
                            label="Nominal invoice"
                            value={formatCurrency(item.invoice_amount)}
                          />
                        ) : (
                          <>
                            <ItemDetail
                              label="Tanggal surat"
                              value={formatDate(item.letter_date)}
                            />
                            {item.employee_name ? (
                              <ItemDetail
                                label="Nama karyawan"
                                value={item.employee_name}
                              />
                            ) : null}
                            {item.document_amount ? (
                              <ItemDetail
                                label="Total dokumen"
                                value={formatCurrency(item.document_amount)}
                              />
                            ) : null}
                          </>
                        )}
                      </div>

                      {item.notes ? (
                        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Catatan
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {item.notes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isConfirmed ? (
          <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-emerald-700">
                <FileCheck2 className="size-5" aria-hidden="true" />
                <h2 className="text-sm font-semibold">
                  Seluruh item sudah diterima
                </h2>
              </div>
              <PrintButton />
            </div>
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Nama penerima
                </p>
                <p className="mt-1 font-semibold">{batch.confirmed_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Waktu konfirmasi
                </p>
                <p className="mt-1 font-semibold">
                  {formatDateTime(batch.confirmed_at)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Unit / pihak
                </p>
                <p className="mt-1 font-semibold">{batch.confirmed_unit || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Catatan
                </p>
                <p className="mt-1 font-semibold">{batch.confirmed_note || "-"}</p>
              </div>
            </div>
            {batch.signature_data ? (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Tanda tangan
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={batch.signature_data}
                  alt="Tanda tangan penerima"
                  className="mt-2 max-h-32 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <form
            action={confirmBatchReceiptAction}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="token" value={token} />
            <h2 className="text-lg font-semibold">Konfirmasi penerimaan</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Tanda tangan ini mengonfirmasi bahwa seluruh item di atas sudah
              diterima.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Nama penerima
                <input
                  name="recipient_name"
                  required
                  defaultValue={batch.recipient_name}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#0A3A60] focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Unit / pihak penerima
                <input
                  name="recipient_unit"
                  defaultValue={batch.recipient_unit || ""}
                  placeholder="Contoh: GA atau HRM"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#0A3A60] focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
              Catatan
              <textarea
                name="recipient_note"
                rows={3}
                placeholder="Opsional"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-[#0A3A60] focus:ring-4 focus:ring-[#0A3A60]/10"
              />
            </label>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Tanda tangan
              </p>
              <SignaturePad />
            </div>

            <PendingSubmitButton
              pendingLabel="Menyimpan tanda terima..."
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
            >
              <FileCheck2 className="size-4" aria-hidden="true" />
              Saya sudah menerima seluruh item
            </PendingSubmitButton>
          </form>
        )}
      </section>
    </main>
  );
}
