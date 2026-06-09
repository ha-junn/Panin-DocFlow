import {
  CheckCircle2,
  ClipboardSignature,
  ExternalLink,
  Link2,
  RotateCcw,
} from "lucide-react";
import {
  createReceiptRequestAction,
  resetReceiptRequestAction,
} from "@/app/receipts/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CopyReceiptLinkButton } from "@/components/CopyReceiptLinkButton";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { LoadingLink } from "@/components/LoadingLink";

export type ReceiptSummary = {
  id: string;
  token: string;
  status: "PENDING" | "CONFIRMED";
  recipient_name: string | null;
  recipient_unit: string | null;
  recipient_note: string | null;
  signature_data: string | null;
  confirmed_at: string | null;
  created_at: string;
};

type ReceiptPanelProps = {
  receipt: ReceiptSummary | null;
  targetType: "DOCUMENT" | "INVOICE" | "OUTGOING";
  targetId: string;
  returnTo: string;
  accentClassName?: string;
};

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

export function ReceiptPanel({
  receipt,
  targetType,
  targetId,
  returnTo,
  accentClassName = "text-[#0A3A60]",
}: ReceiptPanelProps) {
  const receiptPath = receipt ? `/receipt/${receipt.token}` : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <ClipboardSignature className={`size-5 ${accentClassName}`} />
        <h2 className="text-sm font-semibold text-slate-950">
          Tanda Terima Digital
        </h2>
      </div>

      {receipt ? (
        <div className="mt-4 space-y-4">
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              receipt.status === "CONFIRMED"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {receipt.status === "CONFIRMED"
                ? "Sudah diterima"
                : "Menunggu konfirmasi penerima"}
            </div>
            {receipt.status === "CONFIRMED" ? (
              <p className="mt-1 text-xs">
                {receipt.recipient_name} - {formatDateTime(receipt.confirmed_at)}
              </p>
            ) : null}
          </div>

          {receipt.status === "CONFIRMED" ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Penerima
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {receipt.recipient_name || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Unit / pihak penerima
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {receipt.recipient_unit || "-"}
                </p>
              </div>
              {receipt.recipient_note ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Catatan
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-600">
                    {receipt.recipient_note}
                  </p>
                </div>
              ) : null}
              {receipt.signature_data ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Tanda tangan
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receipt.signature_data}
                    alt="Tanda tangan penerima"
                    className="mt-2 max-h-28 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-slate-500">
                Bagikan link ini ke PIC, penerima, atau kurir untuk konfirmasi
                penerimaan dari HP.
              </p>
              <div className="break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                {receiptPath}
              </div>
            </div>
          )}

          {receiptPath ? (
            <div className="space-y-2">
              <CopyReceiptLinkButton href={receiptPath} />

              <LoadingLink
                href={receiptPath}
                target="_blank"
                pendingLabel="Membuka..."
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#0A3A60]/30 hover:bg-slate-50"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Buka Form Tanda Terima
              </LoadingLink>

              <form action={resetReceiptRequestAction}>
                <input type="hidden" name="receipt_id" value={receipt.id} />
                <input type="hidden" name="return_to" value={returnTo} />
                <ConfirmSubmitButton
                  message="Reset tanda terima ini? Link lama dan bukti penerimaan akan dihapus, lalu bisa dibuat ulang."
                  pendingLabel="Mereset..."
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Reset Tanda Terima
                </ConfirmSubmitButton>
              </form>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-6 text-slate-500">
            Buat link tanda terima untuk meminta konfirmasi penerimaan tanpa
            catatan manual di buku.
          </p>
          <form action={createReceiptRequestAction}>
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="target_id" value={targetId} />
            <input type="hidden" name="return_to" value={returnTo} />
            <PendingSubmitButton
              pendingLabel="Membuat link..."
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3A60] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#082f4f]"
            >
              <Link2 className="size-4" aria-hidden="true" />
              Buat Tanda Terima
            </PendingSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
