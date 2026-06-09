"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyReceiptLinkButtonProps = {
  href: string;
};

export function CopyReceiptLinkButton({ href }: CopyReceiptLinkButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeout = window.setTimeout(() => setIsCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  async function copyLink() {
    const absoluteUrl = new URL(href, window.location.origin).toString();
    await navigator.clipboard.writeText(absoluteUrl);
    setIsCopied(true);
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#0A3A60]/30 hover:bg-slate-50"
    >
      {isCopied ? (
        <Check className="size-4 text-emerald-600" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {isCopied ? "Link tersalin" : "Copy Link"}
    </button>
  );
}
