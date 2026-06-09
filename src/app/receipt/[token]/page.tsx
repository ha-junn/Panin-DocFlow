import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ClipboardSignature,
  FileCheck2,
  Landmark,
} from "lucide-react";
import { confirmReceiptAction } from "@/app/receipts/actions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignaturePad } from "./SignaturePad";

type ReceiptPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    confirmed?: string;
    message?: string;
  }>;
};

type PublicReceipt = {
  receipt_id: string;
  target_type: "DOCUMENT" | "INVOICE" | "OUTGOING";
  status: "PENDING" | "CONFIRMED";
  agenda_number: string;
  title: string | null;
  sender_name: string | null;
  recipient_name: string | null;
  department_name: string | null;
  confirmed_name: string | null;
  confirmed_unit: string | null;
  confirmed_note: string | null;
  signature_data: string | null;
  created_at: string;
  confirmed_at: string | null;
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

function formatTargetType(type: PublicReceipt["target_type"]) {
  if (type === "INVOICE") return "Invoice masuk";
  if (type === "OUTGOING") return "Surat keluar";
  return "Dokumen masuk";
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value || "-"}</p>
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
              Tanda terima
            </p>
            <h1 className="text-xl font-semibold">Link tidak bisa dibuka</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{message}</p>
      </section>
    </main>
  );
}

export default async function ReceiptPage({
  params,
  searchParams,
}: ReceiptPageProps) {
  const { token } = await params;
  const { confirmed, message } = await searchParams;

  if (!uuidPattern.test(token)) {
    return <ErrorCard message="Token tanda terima tidak valid." />;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_receipt_by_token", {
    p_token: token,
  });

  if (error) {
    return (
      <ErrorCard message="Tanda terima belum aktif. Jalankan file supabase-add-digital-receipts.sql di Supabase SQL Editor." />
    );
  }

  const receipt = Array.isArray(data)
    ? (data[0] as PublicReceipt | undefined)
    : null;

  if (!receipt) {
    return <ErrorCard message="Data tanda terima tidak ditemukan." />;
  }

  if (confirmed === "1") {
    redirect(`/receipt/${token}`);
  }

  const isConfirmed = receipt.status === "CONFIRMED";

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
                Panin DocFlow
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Tanda Terima Digital
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Konfirmasi penerimaan dokumen secara digital tanpa paraf manual
                di buku.
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
              <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-[#0A3A60]">
                {formatTargetType(receipt.target_type)}
              </span>
              <h2 className="mt-4 text-2xl font-semibold">
                {receipt.agenda_number}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {receipt.title || "-"}
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

          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <InfoItem label="Pengirim / staff" value={receipt.sender_name} />
            <InfoItem label="Tujuan / penerima" value={receipt.recipient_name} />
            <InfoItem label="Departemen" value={receipt.department_name} />
            <InfoItem label="Link dibuat" value={formatDateTime(receipt.created_at)} />
          </div>
        </div>

        {isConfirmed ? (
          <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <FileCheck2 className="size-5" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Penerimaan sudah tercatat</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoItem label="Nama penerima" value={receipt.confirmed_name} />
              <InfoItem label="Unit / pihak" value={receipt.confirmed_unit} />
              <InfoItem
                label="Waktu konfirmasi"
                value={formatDateTime(receipt.confirmed_at)}
              />
              <InfoItem label="Catatan" value={receipt.confirmed_note} />
            </div>
            {receipt.signature_data ? (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Tanda tangan
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receipt.signature_data}
                  alt="Tanda tangan penerima"
                  className="mt-2 max-h-32 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <form
            action={confirmReceiptAction}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="token" value={token} />
            <div>
              <h2 className="text-lg font-semibold">Konfirmasi penerimaan</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Isi nama penerima, lalu tanda tangan di area yang tersedia.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Nama penerima
                <input
                  name="recipient_name"
                  required
                  placeholder="Nama lengkap"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#0A3A60] focus:ring-4 focus:ring-[#0A3A60]/10"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Unit / pihak penerima
                <input
                  name="recipient_unit"
                  placeholder="Contoh: GA, HRM, Kurir"
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
              Saya sudah menerima
            </PendingSubmitButton>
          </form>
        )}
      </section>
    </main>
  );
}
