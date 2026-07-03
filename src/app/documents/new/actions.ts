"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { jakartaDateToIso } from "@/lib/date";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uppercaseText } from "@/lib/text";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
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
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return file.name.split(".").pop()?.toLowerCase() || "bin";
}

function uploadStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 6);

  return `${year}-${month}-${day}-${hour}${minute}${second}-${random}`;
}

function createAttachmentFileName(file: File, prefix: "DOC" | "INV") {
  const extension = getFileExtension(file);
  const safeBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (/^(DOC|INV)-\d{4}-\d{2}-\d{2}-\d{6}-[a-z0-9]{4}$/i.test(safeBaseName)) {
    return `${safeBaseName.toUpperCase()}.${extension}`;
  }

  return `${prefix}-${uploadStamp()}.${extension}`;
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
  const senderName = uppercaseText(requiredString(formData, "sender_name"));
  const letterNumber = uppercaseText(requiredString(formData, "letter_number"));
  const letterDate = requiredString(formData, "letter_date");
  const recipientName = uppercaseText(requiredString(formData, "recipient_name"));
  const departmentId = requiredString(formData, "department_id");
  const subject = uppercaseText(requiredString(formData, "subject"));
  const employeeNames = formData
    .getAll("employee_name")
    .map((value) => uppercaseText(String(value)));
  const amounts = formData
    .getAll("document_amount")
    .map((value) => parseOptionalRupiah(String(value).trim()));
  const transferDescriptions = formData
    .getAll("transfer_description")
    .map((value) => uppercaseText(String(value)));
  const transferAmounts = formData
    .getAll("transfer_amount")
    .map((value) => parseOptionalRupiah(String(value).trim()));
  const categoryId = requiredString(formData, "category_id");
  const notes = uppercaseText(requiredString(formData, "notes"));
  const attachment = formData.get("attachment");

  if (
    !receivedAt ||
    !senderName ||
    !recipientName ||
    !departmentId ||
    !categoryId
  ) {
    redirect(
      "/documents/new?type=letter&message=Lengkapi semua field wajib sebelum menyimpan.",
    );
  }

  const employeeItems = employeeNames
    .map((employeeName, index) => ({
      employeeName: employeeName || null,
      amount: amounts[index] ?? null,
    }))
    .filter((item) => item.employeeName || item.amount);

  const transferItems = transferDescriptions
    .map((description, index) => ({
      employeeName: description || null,
      amount: transferAmounts[index] ?? null,
    }))
    .filter((item) => item.employeeName || item.amount);

  const { data: selectedCategory, error: categoryError } = await supabase
    .from("document_categories")
    .select("id, name, type")
    .eq("id", categoryId)
    .in("type", ["LETTER", "BOTH"])
    .maybeSingle();

  if (categoryError || !selectedCategory) {
    console.error("Failed to validate document category", categoryError);
    redirect(
      "/documents/new?type=letter&message=Kategori dokumen tidak valid.",
    );
  }

  const isTransferNote =
    uppercaseText(selectedCategory.name) === "NOTA PEMINDAHAN";

  if (isTransferNote) {
    if (transferAmounts.some((amount) => amount === undefined)) {
      redirect(
        "/documents/new?type=letter&message=Jumlah Nota Pemindahan harus berupa angka Rupiah lebih dari 0.",
      );
    }

    if (
      transferItems.length === 0 ||
      transferItems.some(
        (item) => !item.employeeName || item.amount === null,
      )
    ) {
      redirect(
        "/documents/new?type=letter&message=Nota Pemindahan wajib memiliki Keterangan dan Jumlah yang lengkap.",
      );
    }
  } else {
    if (amounts.some((amount) => amount === undefined)) {
      redirect(
        "/documents/new?type=letter&message=Total harus berupa angka Rupiah lebih dari 0 atau dikosongkan.",
      );
    }

    if (employeeItems.some((item) => !item.employeeName)) {
      redirect(
        "/documents/new?type=letter&message=Lengkapi nama karyawan pada setiap baris yang diisi.",
      );
    }
  }

  const documentsToCreate = isTransferNote
    ? transferItems
    : employeeItems.length > 0
      ? employeeItems
      : [{ employeeName: null, amount: null }];

  let attachmentUrl: string | null = null;

  if (attachment instanceof File && attachment.size > 0) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) {
      redirect(
        "/documents/new?type=letter&message=Lampiran hanya boleh PDF atau gambar.",
      );
    }

    if (attachment.size > MAX_ATTACHMENT_SIZE) {
      redirect(
        "/documents/new?type=letter&message=Ukuran lampiran maksimal 10 MB.",
      );
    }

    const filePath = `${user.id}/letters/${createAttachmentFileName(
      attachment,
      "DOC",
    )}`;

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

  const payload = documentsToCreate.map((item) => ({
    type: "LETTER",
    letter_number: letterNumber || null,
    letter_date: letterDate || null,
    received_at: jakartaDateToIso(receivedAt),
    sender_name: senderName,
    recipient_name: recipientName,
    department_id: departmentId,
    subject: subject || "TANPA PERIHAL",
    employee_name: item.employeeName,
    amount: item.amount,
    category_id: categoryId,
    notes: notes || null,
    attachment_url: attachmentUrl,
    created_by: user.id,
    updated_by: user.id,
  }));

  const { error } = await supabase.from("documents").insert(payload);

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
  revalidatePath("/documents");
  redirect("/?created=letter");
}
