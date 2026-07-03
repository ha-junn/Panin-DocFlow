"use client";

import { useMemo, useState } from "react";
import { UserRound } from "lucide-react";

export type VendorPicSuggestion = {
  vendor: string;
  pic: string;
};

type VendorPicFieldsProps = {
  suggestions: VendorPicSuggestion[];
};

function normalize(value: string) {
  return value.trim().toLocaleUpperCase("id-ID").replace(/\s+/g, " ");
}

function uppercase(value: string) {
  return value.toLocaleUpperCase("id-ID");
}

export function VendorPicFields({ suggestions }: VendorPicFieldsProps) {
  const [vendorName, setVendorName] = useState("");
  const [internalPic, setInternalPic] = useState("");
  const [lastAutoPic, setLastAutoPic] = useState("");
  const vendorSuggestionsId = "invoice-vendor-suggestions";

  const vendorPicByName = useMemo(() => {
    return new Map(
      suggestions.map((suggestion) => [
        normalize(suggestion.vendor),
        suggestion.pic,
      ]),
    );
  }, [suggestions]);

  function handleVendorChange(value: string) {
    const nextVendor = uppercase(value);
    const matchedPic = vendorPicByName.get(normalize(nextVendor));
    const canAutoFillPic = !internalPic.trim() || internalPic === lastAutoPic;

    setVendorName(nextVendor);

    if (matchedPic && canAutoFillPic) {
      setInternalPic(matchedPic);
      setLastAutoPic(matchedPic);
      return;
    }

    if (!matchedPic && internalPic === lastAutoPic) {
      setInternalPic("");
      setLastAutoPic("");
    }
  }

  function handlePicChange(value: string) {
    setInternalPic(uppercase(value));
  }

  return (
    <div className="grid gap-5 md:col-span-2 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">
          Vendor/pengirim
        </span>
        <input
          name="vendor_name"
          type="text"
          required
          value={vendorName}
          onChange={(event) => handleVendorChange(event.target.value)}
          list={vendorSuggestionsId}
          placeholder="Contoh: PT Nata Surya Cemerlang"
          className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
        />
        <datalist id={vendorSuggestionsId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion.vendor} value={suggestion.vendor} />
          ))}
        </datalist>
      </label>

      <label className="block">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <UserRound className="size-4 text-slate-400" />
          PIC/penerima internal
        </span>
        <input
          name="internal_pic"
          type="text"
          required
          value={internalPic}
          onChange={(event) => handlePicChange(event.target.value)}
          placeholder="Nama PIC internal"
          className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
        />
      </label>
    </div>
  );
}
