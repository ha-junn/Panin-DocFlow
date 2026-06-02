"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function requiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseOptionalRupiah(value: string) {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/rp/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }

  return amount;
}

function getFileExtension(file: File) {
  const fallbackExtension = file.type === "application/pdf" ? "pdf" : "bin";
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension || fallbackExtension;
}

export async function createLetterAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const receivedAt = requiredString(formData, "received_at");
  const senderName = requiredString(formData, "sender_name");
  const letterNumber = requiredString(formData, "letter_number");
  const letterDate = requiredString(formData, "letter_date");
  const recipientName = requiredString(formData, "recipient_name");
  const departmentId = requiredString(formData, "department_id");
  const subject = requiredString(formData, "subject");
  const employeeName = requiredString(formData, "employee_name");
  const amountInput = requiredString(formData, "document_amount");
  const amount = parseOptionalRupiah(amountInput);
  const categoryId = requiredString(formData, "category_id");
  const notes = requiredString(formData, "notes");
  const attachment = formData.get("attachment");

  if (
    !receivedAt ||
    !senderName ||
    !recipientName ||
    !departmentId ||
    !subject ||
    !categoryId
  ) {
    redirect(
      "/documents/new?type=letter&message=Lengkapi semua field wajib sebelum menyimpan.",
    );
  }

  if (amount === undefined) {
    redirect(
      "/documents/new?type=letter&message=Total harus berupa angka Rupiah lebih dari 0 atau dikosongkan.",
    );
  }

  let attachmentUrl: string | null = null;

  if (attachment instanceof File && attachment.size > 0) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) {
      redirect(
        "/documents/new?type=letter&message=Lampiran hanya boleh PDF, JPG, atau PNG.",
      );
    }

    if (attachment.size > MAX_ATTACHMENT_SIZE) {
      redirect(
        "/documents/new?type=letter&message=Ukuran lampiran maksimal 10 MB.",
      );
    }

    const extension = getFileExtension(attachment);
    const timestamp = Date.now();
    const safeFileName = attachment.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const filePath = `${user.id}/letters/${timestamp}-${safeFileName || "lampiran"}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("document-attachments")
      .upload(filePath, attachment, {
        contentType: attachment.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload letter attachment", uploadError);
      redirect(
        `/documents/new?type=letter&message=${encodeURIComponent(
          "Lampiran gagal diupload. Pastikan bucket document-attachments sudah dibuat dari schema Supabase.",
        )}`,
      );
    }

    attachmentUrl = filePath;
  }

  const { error } = await supabase.from("documents").insert({
    type: "LETTER",
    letter_number: letterNumber || null,
    letter_date: letterDate || null,
    received_at: new Date(receivedAt).toISOString(),
    sender_name: senderName,
    recipient_name: recipientName,
    department_id: departmentId,
    subject,
    employee_name: employeeName || null,
    amount,
    category_id: categoryId,
    notes: notes || null,
    attachment_url: attachmentUrl,
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) {
    console.error("Failed to create letter", error);
    if (attachmentUrl) {
      await supabase.storage.from("document-attachments").remove([attachmentUrl]);
    }

    redirect(
      `/documents/new?type=letter&message=${encodeURIComponent(
        "Surat gagal disimpan. Pastikan schema Supabase sudah dijalankan dan data master tersedia.",
      )}`,
    );
  }

  revalidatePath("/");
  redirect("/?created=letter");
}
