"use client";

import { useState } from "react";

function formatLetterNumber(value: string) {
  const normalized = value
    .toLocaleUpperCase("id-ID")
    .replace(/[^A-Z0-9]/g, "");
  const parts = normalized.match(/^(\d+)([A-Z]*)(\d*)$/);

  if (!parts) {
    return normalized;
  }

  const [, sequenceNumber, letterCodes, year] = parts;
  const groups = [
    sequenceNumber,
    letterCodes.slice(0, 3),
    letterCodes.slice(3),
    year,
  ];

  return groups.filter(Boolean).join("/");
}

export function LetterNumberInput() {
  const [value, setValue] = useState("");

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Nomor surat</span>
      <input
        name="letter_number"
        type="text"
        value={value}
        onChange={(event) => setValue(formatLetterNumber(event.target.value))}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="Contoh: 14DNDGA26"
        className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
      />
      <span className="mt-1.5 block text-xs leading-5 text-slate-500">
        Garis miring otomatis. Contoh: 14DNDGA26 atau 147BNOSDM26
      </span>
    </label>
  );
}
