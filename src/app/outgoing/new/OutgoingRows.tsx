"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type OutgoingRow = {
  id: string;
  confidential: boolean;
};

function createRow(): OutgoingRow {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    confidential: false,
  };
}

export function OutgoingRows() {
  const [rows, setRows] = useState<OutgoingRow[]>([createRow()]);

  function addRow() {
    setRows((currentRows) => [...currentRows, createRow()]);
  }

  function removeRow(rowId: string) {
    setRows((currentRows) =>
      currentRows.length === 1
        ? currentRows
        : currentRows.filter((row) => row.id !== rowId),
    );
  }

  function setConfidential(rowId: string, confidential: boolean) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId ? { ...row, confidential } : row,
      ),
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">
              Surat keluar {index + 1}
            </p>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={rows.length === 1}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-[#B9151B] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Hapus baris
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Nomor surat opsional
              </span>
              <input
                name="letter_number"
                type="text"
                placeholder="Contoh: 010/SDM/BAN/26"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:ring-4 focus:ring-[#0A3A60]/10"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Tujuan / U.P
              </span>
              <input
                name="destination_name"
                type="text"
                placeholder="Cabang, kantor, atau nama penerima"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:ring-4 focus:ring-[#0A3A60]/10"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={row.confidential}
                onChange={(event) =>
                  setConfidential(row.id, event.currentTarget.checked)
                }
                className="size-4 rounded border-slate-300 text-[#0A3A60] focus:ring-[#0A3A60]"
              />
              Confidential
            </label>
            <input
              type="hidden"
              name="confidential"
              value={row.confidential ? "true" : "false"}
            />

            <label className="block">
              <span className="sr-only">Catatan baris</span>
              <input
                name="row_notes"
                type="text"
                placeholder="Catatan khusus untuk baris ini"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:ring-4 focus:ring-[#0A3A60]/10"
              />
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#0A3A60]/30 hover:bg-slate-50 hover:text-[#0A3A60]"
      >
        <Plus className="size-4" aria-hidden="true" />
        Tambah Baris Surat Keluar
      </button>
    </div>
  );
}
