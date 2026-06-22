"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type TransferNoteRow = {
  id: string;
};

function createRow(): TransferNoteRow {
  return {
    id: crypto.randomUUID(),
  };
}

export function TransferNoteRows() {
  const [rows, setRows] = useState<TransferNoteRow[]>([createRow()]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_44px]">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          Keterangan
        </p>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          Jumlah
        </p>
        <span className="hidden md:block" />
      </div>

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_44px]"
        >
          <input
            name="transfer_description"
            type="text"
            placeholder={`Keterangan ${index + 1}`}
            className="h-11 rounded-lg border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />
          <input
            name="transfer_amount"
            type="text"
            inputMode="numeric"
            placeholder="Contoh: Rp 150.000"
            className="h-11 rounded-lg border border-amber-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          />
          <button
            type="button"
            disabled={rows.length === 1}
            onClick={() => {
              setRows((currentRows) =>
                currentRows.filter((currentRow) => currentRow.id !== row.id),
              );
            }}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-amber-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-[#D71920] disabled:cursor-not-allowed disabled:opacity-40 md:w-11"
            aria-label="Hapus baris nota pemindahan"
            title="Hapus baris"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((currentRows) => [...currentRows, createRow()])}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-50"
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Baris Nota Pemindahan
      </button>
    </div>
  );
}
