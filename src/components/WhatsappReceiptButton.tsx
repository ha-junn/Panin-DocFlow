"use client";

import { MessageCircle } from "lucide-react";

type WhatsappReceiptButtonProps = {
  phoneNumber: string;
  recipientName: string;
  receiptDate: string;
  itemCount: number;
  href: string;
  compact?: boolean;
  itemLabel?: string;
};

export function WhatsappReceiptButton({
  phoneNumber,
  recipientName,
  receiptDate,
  itemCount,
  href,
  compact = false,
  itemLabel = "dokumen/invoice",
}: WhatsappReceiptButtonProps) {
  function openWhatsapp() {
    const receiptUrl = new URL(href, window.location.origin).toString();
    const message = [
      `Halo ${recipientName},`,
      "",
      `Mohon konfirmasi penerimaan ${itemCount} ${itemLabel} tanggal ${receiptDate}.`,
      `Silakan buka link tanda terima berikut:`,
      receiptUrl,
      "",
      "Terima kasih.",
    ].join("\n");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={openWhatsapp}
      className={[
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20BD5A]",
        compact ? "w-auto" : "w-full",
      ].join(" ")}
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      Kirim WhatsApp
    </button>
  );
}
