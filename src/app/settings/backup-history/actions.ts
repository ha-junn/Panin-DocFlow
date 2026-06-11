"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BackupStatus = "BACKED_UP" | "VERIFIED" | "CLEANED";

type BackupDocument = {
  type: "LETTER" | "INVOICE";
  attachment_url: string | null;
};

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const STATUS_VALUES = new Set<BackupStatus>(["BACKED_UP", "VERIFIED", "CLEANED"]);

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function backupHistoryRedirect(
  key: "message" | "error",
  value: string,
  month?: string,
) {
  const query = new URLSearchParams({ [key]: value });

  if (month) {
    query.set("month", month);
  }

  return `/settings/backup-history?${query.toString()}`;
}

function isValidMonth(value: string) {
  if (!MONTH_PATTERN.test(value)) {
    return false;
  }

  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 2020 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12
  );
}

function getMonthRange(monthValue: string) {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));

  return {
    monthDate: `${monthValue}-01`,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function normalizeStatus(value: string): BackupStatus {
  return STATUS_VALUES.has(value as BackupStatus)
    ? (value as BackupStatus)
    : "BACKED_UP";
}

async function getCurrentUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, userId: user.id };
}

export async function createBackupHistoryAction(formData: FormData) {
  const { supabase, userId } = await getCurrentUserId();
  const month = formString(formData, "month");
  const status = normalizeStatus(formString(formData, "status"));
  const backupFileName = formString(formData, "backup_file_name") || null;
  const notes = formString(formData, "notes") || null;

  if (!isValidMonth(month)) {
    redirect(
      backupHistoryRedirect(
        "error",
        "Bulan backup tidak valid. Pilih bulan dari kalender.",
      ),
    );
  }

  const { monthDate, startIso, endIso } = getMonthRange(month);
  const { data, error } = await supabase
    .from("documents")
    .select("type, attachment_url")
    .gte("received_at", startIso)
    .lt("received_at", endIso)
    .range(0, 4999);

  if (error) {
    console.error("Failed to count backup data", error);
    redirect(backupHistoryRedirect("error", "Data bulan backup gagal dihitung.", month));
  }

  const documents = (data ?? []) as BackupDocument[];
  const documentCount = documents.filter((item) => item.type === "LETTER").length;
  const invoiceCount = documents.filter((item) => item.type === "INVOICE").length;
  const attachmentCount = documents.filter((item) => item.attachment_url).length;
  const now = new Date().toISOString();

  const { error: upsertError } = await supabase.from("backup_histories").upsert(
    {
      backup_month: monthDate,
      document_count: documentCount,
      invoice_count: invoiceCount,
      attachment_count: attachmentCount,
      status,
      backup_file_name: backupFileName,
      notes,
      created_by: userId,
      updated_by: userId,
      verified_at: status === "VERIFIED" ? now : null,
      cleaned_at: status === "CLEANED" ? now : null,
    },
    { onConflict: "backup_month" },
  );

  if (upsertError) {
    console.error("Failed to save backup history", upsertError);
    redirect(
      backupHistoryRedirect(
        "error",
        "Riwayat backup gagal disimpan. Pastikan SQL Riwayat Backup sudah dijalankan.",
        month,
      ),
    );
  }

  revalidatePath("/settings/backup-history");
  redirect(backupHistoryRedirect("message", "Riwayat backup berhasil dicatat.", month));
}

export async function updateBackupHistoryStatusAction(formData: FormData) {
  const { supabase, userId } = await getCurrentUserId();
  const id = formString(formData, "id");
  const month = formString(formData, "month");
  const status = normalizeStatus(formString(formData, "status"));
  const now = new Date().toISOString();

  if (!id) {
    redirect(backupHistoryRedirect("error", "Riwayat backup tidak ditemukan.", month));
  }

  const payload: Record<string, string | null> = {
    status,
    updated_by: userId,
  };

  if (status === "VERIFIED") {
    payload.verified_at = now;
  }

  if (status === "CLEANED") {
    payload.cleaned_at = now;
  }

  const { error } = await supabase
    .from("backup_histories")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("Failed to update backup history status", error);
    redirect(backupHistoryRedirect("error", "Status riwayat gagal diperbarui.", month));
  }

  revalidatePath("/settings/backup-history");
  redirect(backupHistoryRedirect("message", "Status riwayat backup diperbarui.", month));
}

export async function deleteBackupHistoryAction(formData: FormData) {
  const { supabase } = await getCurrentUserId();
  const id = formString(formData, "id");
  const month = formString(formData, "month");

  if (!id) {
    redirect(backupHistoryRedirect("error", "Riwayat backup tidak ditemukan.", month));
  }

  const { error } = await supabase.from("backup_histories").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete backup history", error);
    redirect(backupHistoryRedirect("error", "Riwayat backup gagal dihapus.", month));
  }

  revalidatePath("/settings/backup-history");
  redirect(backupHistoryRedirect("message", "Riwayat backup berhasil dihapus.", month));
}
