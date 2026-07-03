"use client";

import { useState } from "react";

type RupiahInputProps = {
  name: string;
  defaultValue?: number | string | null;
  placeholder?: string;
  className?: string;
};

export function formatRupiahInput(value: string | number | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(digits));
}

export function RupiahInput({
  name,
  defaultValue,
  placeholder = "Contoh: 150.000",
  className,
}: RupiahInputProps) {
  const [value, setValue] = useState(() => formatRupiahInput(defaultValue));

  return (
    <input
      name={name}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(event) => setValue(formatRupiahInput(event.target.value))}
      placeholder={placeholder}
      className={className}
    />
  );
}
