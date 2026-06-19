import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ClipboardSignature,
  FileCheck2,
  MailCheck,
  Send,
} from "lucide-react";
import { confirmOutgoingBatchReceiptAction } from "@/app/receipts/actions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { PrintButton } from "@/components/PrintButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignaturePad } from "../../receipt/[token]/SignaturePad";

type OutgoingBatchReceiptPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string; message?: string }>;
};

type PublicOutgoingBatchItem = {
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
  letter_number: string | null;
  subject: string | null;
  sender_staff: string;
  sender_department: string;
  destination_name: string;
  attention_to: string | null;
  sent_at: string;
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

function ErrorCard({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-orange-50 px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-xl rounded-xl border border-orange-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <ClipboardSignature className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
              Tanda terima surat keluar
            </p>
            <h1 className="text-xl font-semibold">Link tidak bisa dibuka</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{message}</p>
      </section>
    </main>
  );
}

export default async function OutgoingBatchReceiptPage({
  params,
  searchParams,
}: OutgoingBatchReceiptPageProps) {
  const { token } = await params;
  const { confirmed, message } = await searchParams;

  if (!uuidPattern.test(token)) {
    return <ErrorCard message="Token tanda terima surat keluar tidak valid." />;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "get_outgoing_receipt_batch_by_token",
    { p_token: token },
  );

  if (error) {
    return (
      <ErrorCard message="Fitur tanda terima surat keluar belum aktif. Jalankan file supabase-add-outgoing-batch-receipts.sql di Supabase SQL Editor." />
    );
  }

  const items = (Array.isArray(data) ? data : []) as PublicOutgoingBatchItem[];
  const batch = items[0];

  if (!batch) {
    return <ErrorCard message="Data tanda terima surat keluar tidak ditemukan." />;
  }

  if (confirmed === "1") {
    redirect(`/receipt-outgoing-batch/${token}`);
  }

  const isConfirmed = batch.status === "CONFIRMED";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_42%)] px-4 py-6 text-slate-950 sm:py-10">
      <section className="mx-auto max-w-3xl space-y-5">
        <div className="overflow-hidden rounded-xl border border-orange-200 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />
          <div className="flex items-start gap-3 p-5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
              <Send className="size-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
                Panin DocFlow · Surat Keluar
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Tanda Terima Pengiriman
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Konfirmasi bahwa seluruh surat keluar dalam daftar ini sudah
                diterima oleh tujuan yang benar.
              </p>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {message}
          </div>
        ) : null}

        <div className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">
                <MailCheck className="size-3.5" aria-hidden="true" />
                {items.length} surat keluar
              </span>
              <h2 className="mt-4 text-2xl font-semibold">
                Diserahkan ke {batch.recipient_name}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {batch.recipient_unit || "Tujuan belum ditentukan"}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                isConfirmed
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-orange-100 text-orange-800"
              }`}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {isConfirmed ? "Sudah diterima" : "Menunggu penerima"}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-orange-100">
            <div className="divide-y divide-orange-100">
              {items.map((item, index) => (
                <div
                  key={item.item_id}
                  className="grid gap-2 bg-white px-4 py-4 sm:grid-cols-[36px_minmax(0,1fr)_auto]"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-orange-100 text-xs font-bold text-orange-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-950">
                      {item.agenda_number}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.subject || item.letter_number || "Surat keluar"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.sender_staff} · {item.sender_department} ·{" "}
                      {item.destination_name}
                    </p>
                  </div>
                  <span className="h-fit rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
                    Surat Keluar
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isConfirmed ? (
          <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-emerald-700">
                <FileCheck2 className="size-5" aria-hidden="true" />
                <h2 className="text-sm font-semibold">
                  Seluruh surat sudah diterima
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
                  Unit / tujuan
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
                  alt="Tanda tangan penerima surat keluar"
                  className="mt-2 max-h-32 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <form
            action={confirmOutgoingBatchReceiptAction}
            className="rounded-xl border border-orange-200 bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="token" value={token} />
            <h2 className="text-lg font-semibold">Konfirmasi penerimaan surat</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Satu tanda tangan mengonfirmasi seluruh surat keluar di atas.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Nama penerima
                <input
                  name="recipient_name"
                  required
                  placeholder="Nama petugas penerima"
                  className="h-12 w-full rounded-lg border border-orange-200 bg-white px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Unit / tujuan
                <input
                  name="recipient_unit"
                  defaultValue={batch.recipient_name}
                  readOnly
                  className="h-12 w-full rounded-lg border border-orange-200 bg-white px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2 text-sm font-semibold text-slate-700">
              Catatan
              <textarea
                name="recipient_note"
                rows={3}
                placeholder="Opsional"
                className="w-full rounded-lg border border-orange-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
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
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              <FileCheck2 className="size-4" aria-hidden="true" />
              Saya sudah menerima seluruh surat
            </PendingSubmitButton>
          </form>
        )}
      </section>
    </main>
  );
}
