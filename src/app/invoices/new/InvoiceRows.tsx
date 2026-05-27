"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type InvoiceRow = {
  id: string;
};

function createRow(): InvoiceRow {
  return {
    id: crypto.randomUUID(),
  };
}

export function InvoiceRows() {
  const [rows, setRows] = useState<InvoiceRow[]>([createRow()]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_44px]">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          Nomor invoice (opsional)
        </p>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          Nominal (opsional)
        </p>
        <span className="hidden md:block" />
      </div>

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_44px]"
        >
          <input
            name="invoice_number"
            type="text"
            placeholder={`Nomor invoice ${index + 1} (opsional)`}
            className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
          />
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Opsional"
            className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
          />
          <button
            type="button"
            disabled={rows.length === 1}
            onClick={() => {
              setRows((currentRows) =>
                currentRows.filter((currentRow) => currentRow.id !== row.id),
              );
            }}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-[#D71920] disabled:cursor-not-allowed disabled:opacity-40 md:w-11"
            aria-label="Hapus baris invoice"
            title="Hapus baris"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}

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
