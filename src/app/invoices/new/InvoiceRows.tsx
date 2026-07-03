"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { RupiahInput } from "@/components/RupiahInput";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
};

function createInvoiceNumber() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();

  return `INV-${date}-${random}`;
}

function createRow(): InvoiceRow {
  return {
    id: crypto.randomUUID(),
    invoiceNumber: createInvoiceNumber(),
  };
}

export function InvoiceRows() {
  const [rows, setRows] = useState<InvoiceRow[]>([createRow()]);

  function regenerateInvoiceNumber(rowId: string) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? { ...row, invoiceNumber: createInvoiceNumber() }
          : row,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_92px]">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          Nomor invoice / kode unik
        </p>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          Nominal (opsional)
        </p>
        <span className="hidden md:block" />
      </div>

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_92px]"
        >
          <input
            key={row.invoiceNumber}
            name="invoice_number"
            type="text"
            defaultValue={row.invoiceNumber}
            placeholder={`Nomor invoice ${index + 1}`}
            className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
          />
          <RupiahInput
            name="amount"
            placeholder="Opsional"
            className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => regenerateInvoiceNumber(row.id)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0A3A60] transition hover:border-[#0A3A60]/30 hover:bg-sky-50"
              aria-label="Buat kode unik baru"
              title="Buat kode unik baru"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={rows.length === 1}
              onClick={() => {
                setRows((currentRows) =>
                  currentRows.filter((currentRow) => currentRow.id !== row.id),
                );
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-[#D71920] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Hapus baris invoice"
              title="Hapus baris"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}

      <p className="text-xs leading-5 text-slate-500">
        Kode unik dibuat otomatis. Jika invoice memiliki nomor resmi, kode ini
        boleh langsung diganti.
      </p>

      <button
        type="button"
        onClick={() => setRows((currentRows) => [...currentRows, createRow()])}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#0A3A60]/30 hover:bg-slate-50"
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Baris Invoice
      </button>
    </div>
  );
}
