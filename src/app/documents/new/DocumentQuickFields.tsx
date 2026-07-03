"use client";

import { useMemo, useState } from "react";
import { Building2, Check, Tags, UserRound } from "lucide-react";
import { LetterNumberInput } from "./LetterNumberInput";

type Department = {
  id: string;
  name: string;
  code: string;
};

type Category = {
  id: string;
  name: string;
  type: "LETTER" | "INVOICE" | "BOTH";
};

type DocumentQuickFieldsProps = {
  departments: Department[];
  categories: Category[];
};

const recipientSuggestions = [
  "DEPIKA",
  "YENI",
  "YOEL",
  "BUDI IRAWAN",
  "DEPIKA / YUSAK",
  "SHINTA",
];

const quickCategoryNames = [
  "AMP TERTUTUP",
  "KOP SURAT",
  "BPKU",
  "MEMO",
  "MAKAN & TRANSPORT",
  "TRANSPORT DINAS",
  "FORM LEMBUR",
  "INTERNAL",
  "NOTA PEMINDAHAN",
  "UMUM",
];

function normalizeName(value: string) {
  return value.trim().toUpperCase();
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DocumentQuickFields({
  departments,
  categories,
}: DocumentQuickFieldsProps) {
  const [recipientName, setRecipientName] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [showMoreCategories, setShowMoreCategories] = useState(false);

  const quickCategories = useMemo(() => {
    return quickCategoryNames
      .map((name) =>
        categories.find((category) => normalizeName(category.name) === name),
      )
      .filter(Boolean) as Category[];
  }, [categories]);

  const quickCategoryIds = useMemo(
    () => new Set(quickCategories.map((category) => category.id)),
    [quickCategories],
  );

  const otherCategories = categories.filter(
    (category) => !quickCategoryIds.has(category.id),
  );

  const selectedOtherCategory = otherCategories.find(
    (category) => category.id === selectedCategoryId,
  );

  return (
    <>
      <input name="department_id" type="hidden" value={selectedDepartmentId} />
      <input name="category_id" type="hidden" value={selectedCategoryId} />

      <div className="block">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <UserRound className="size-4 text-slate-400" />
          Ditujukan kepada
        </span>
        <input
          name="recipient_name"
          type="text"
          required
          value={recipientName}
          onChange={(event) => setRecipientName(event.target.value)}
          placeholder="Nama penerima internal"
          className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0A3A60] focus:bg-white focus:ring-4 focus:ring-[#0A3A60]/10"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recipientSuggestions.map((recipient) => {
            const isSelected = normalizeName(recipientName) === recipient;

            return (
              <button
                key={recipient}
                type="button"
                onClick={() => setRecipientName(recipient)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold transition",
                  isSelected
                    ? "border-[#0A3A60] bg-[#0A3A60] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#0A3A60]/30 hover:bg-[#0A3A60]/5 hover:text-[#0A3A60]",
                )}
              >
                {isSelected ? <Check className="size-3" /> : null}
                {recipient}
              </button>
            );
          })}
        </div>
      </div>

      <div className="block">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Building2 className="size-4 text-slate-400" />
          Departemen tujuan
        </span>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {departments.map((department) => {
            const isSelected = selectedDepartmentId === department.id;

            return (
              <button
                key={department.id}
                type="button"
                onClick={() => setSelectedDepartmentId(department.id)}
                className={cn(
                  "flex min-h-9 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs font-semibold transition",
                  isSelected
                    ? "border-[#0A3A60] bg-[#0A3A60] text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0A3A60]/30 hover:bg-white hover:text-[#0A3A60]",
                )}
              >
                <span className="min-w-0">
                  <span className="font-bold">{department.code}</span>
                  <span className="ml-1 font-medium opacity-80">
                    {department.name}
                  </span>
                </span>
                {isSelected ? <Check className="size-3.5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Pilih salah satu: GA atau HRM.
        </p>

        <div className="mt-4">
          <LetterNumberInput />
        </div>
      </div>

      <div className="block">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Tags className="size-4 text-slate-400" />
          Kategori
        </span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {quickCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={cn(
                  "flex min-h-10 w-full items-center justify-start gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold leading-4 transition",
                  isSelected
                    ? "border-[#0A3A60] bg-[#0A3A60] text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0A3A60]/30 hover:bg-white hover:text-[#0A3A60]",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    isSelected
                      ? "border-white/50 bg-white/10"
                      : "border-slate-300 bg-white",
                  )}
                >
                  {isSelected ? <Check className="size-3" /> : null}
                </span>
                <span>{category.name}</span>
              </button>
            );
          })}

          {otherCategories.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowMoreCategories((current) => !current)}
              className={cn(
                "col-span-2 flex min-h-10 w-full items-center justify-start gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold leading-4 transition",
                selectedOtherCategory
                  ? "border-[#0A3A60] bg-[#0A3A60] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-[#0A3A60]/30 hover:bg-[#0A3A60]/5 hover:text-[#0A3A60]",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border",
                  selectedOtherCategory
                    ? "border-white/50 bg-white/10"
                    : "border-slate-300 bg-slate-50",
                )}
              >
                {selectedOtherCategory ? <Check className="size-3" /> : null}
              </span>
              <span>
                {selectedOtherCategory
                  ? selectedOtherCategory.name
                  : "Lainnya"}
              </span>
            </button>
          ) : null}
        </div>

        {showMoreCategories && otherCategories.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            {otherCategories.map((category) => {
              const isSelected = selectedCategoryId === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setShowMoreCategories(false);
                  }}
                  className={cn(
                    "flex min-h-10 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold leading-4 transition",
                    isSelected
                      ? "bg-[#0A3A60] text-white"
                      : "bg-white text-slate-600 hover:bg-[#0A3A60]/5 hover:text-[#0A3A60]",
                  )}
                >
                  {category.name}
                  {isSelected ? <Check className="size-3" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </>
  );
}
