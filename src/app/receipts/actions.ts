"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ReceiptTargetType = "DOCUMENT" | "INVOICE" | "OUTGOING";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function withMessage(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}message=${encodeURIComponent(message)}`;
}

function isReceiptTargetType(value: string): value is ReceiptTargetType {
  return ["DOCUMENT", "INVOICE", "OUTGOING"].includes(value);
}

export async function createReceiptRequestAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const targetType = formString(formData, "target_type");
  const targetId = formString(formData, "target_id");
  const returnTo = normalizeReturnTo(formString(formData, "return_to"));

  if (!isReceiptTargetType(targetType) || !targetId) {
    redirect(withMessage(returnTo, "Target tanda terima tidak valid."));
  }

  const targetColumn =
    targetType === "OUTGOING" ? "outgoing_letter_id" : "document_id";

  const { data: existingReceipt, error: existingError } = await supabase
    .from("receipt_requests")
    .select("id")
    .eq(targetColumn, targetId)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check receipt request", existingError);
    redirect(
      withMessage(
        returnTo,
        "Tanda terima gagal dicek. Pastikan SQL tanda terima digital sudah dijalankan.",
      ),
    );
  }

  if (existingReceipt) {
    revalidatePath(returnTo);
    redirect(withMessage(returnTo, "Link tanda terima sudah tersedia."));
  }

  const payload: Record<string, string> = {
    target_type: targetType,
    created_by: user.id,
  };

  if (targetType === "OUTGOING") {
    payload.outgoing_letter_id = targetId;
  } else {
    payload.document_id = targetId;
  }

  const { error } = await supabase.from("receipt_requests").insert(payload);

  if (error) {
    console.error("Failed to create receipt request", error);
    redirect(
      withMessage(
        returnTo,
        `Tanda terima gagal dibuat. Detail: ${error.message}`,
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(withMessage(returnTo, "Link tanda terima berhasil dibuat."));
}

export async function createBatchReceiptAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const returnTo = normalizeReturnTo(formString(formData, "return_to"));
  const recipientName = formString(formData, "recipient_name");
  const recipientUnit = formString(formData, "recipient_unit");
  const documentIds = Array.from(
    new Set(
      formData
        .getAll("document_ids")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );

  if (!recipientName || documentIds.length < 2) {
    redirect(
      withMessage(
        returnTo,
        "Pilih minimal dua dokumen atau invoice untuk tanda terima gabungan.",
      ),
    );
  }

  const [{ data: documents, error: documentsError }, singleResult, batchResult] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id")
        .in("id", documentIds),
      supabase
        .from("receipt_requests")
        .select("document_id")
        .in("document_id", documentIds),
      supabase
        .from("receipt_batch_items")
        .select("document_id")
        .in("document_id", documentIds),
    ]);

  if (
    documentsError ||
    singleResult.error ||
    batchResult.error ||
    (documents ?? []).length !== documentIds.length
  ) {
    console.error("Failed to validate batch receipt items", {
      documentsError,
      singleError: singleResult.error,
      batchError: batchResult.error,
    });
    redirect(
      withMessage(
        returnTo,
        "Tanda terima gabungan gagal divalidasi. Pastikan SQL batch sudah dijalankan.",
      ),
    );
  }

  if ((singleResult.data ?? []).length > 0 || (batchResult.data ?? []).length > 0) {
    redirect(
      withMessage(
        returnTo,
        "Sebagian data yang dipilih sudah memiliki tanda terima.",
      ),
    );
  }

  const { data: batch, error: batchError } = await supabase
    .from("receipt_batches")
    .insert({
      recipient_name: recipientName,
      recipient_unit: recipientUnit || null,
      created_by: user.id,
    })
    .select("id, token")
    .single();

  if (batchError || !batch) {
    console.error("Failed to create receipt batch", batchError);
    redirect(
      withMessage(
        returnTo,
        `Tanda terima gabungan gagal dibuat. Detail: ${
          batchError?.message ?? "Data batch tidak tersedia."
        }`,
      ),
    );
  }

  const { error: itemsError } = await supabase
    .from("receipt_batch_items")
    .insert(
      documentIds.map((documentId) => ({
        batch_id: batch.id,
        document_id: documentId,
      })),
    );

  if (itemsError) {
    await supabase.from("receipt_batches").delete().eq("id", batch.id);
    console.error("Failed to create receipt batch items", itemsError);
    redirect(
      withMessage(
        returnTo,
        `Item tanda terima gabungan gagal disimpan. Detail: ${itemsError.message}`,
      ),
    );
  }

  revalidatePath("/receipts");
  redirect(
    `/receipts?batch_created=${encodeURIComponent(batch.token)}&message=${encodeURIComponent(
      `Tanda terima gabungan untuk ${recipientName} berhasil dibuat.`,
    )}`,
  );
}

export async function confirmReceiptAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const token = formString(formData, "token");
  const recipientName = formString(formData, "recipient_name");
  const recipientUnit = formString(formData, "recipient_unit");
  const recipientNote = formString(formData, "recipient_note");
  const signatureData = formString(formData, "signature_data");

  if (!token) {
    redirect("/receipt/invalid?message=Tanda terima tidak valid.");
  }

  if (!recipientName) {
    redirect(
      `/receipt/${token}?message=${encodeURIComponent(
        "Nama penerima wajib diisi.",
      )}`,
    );
  }

  const { error } = await supabase.rpc("confirm_receipt_by_token", {
    p_token: token,
    p_recipient_name: recipientName,
    p_recipient_unit: recipientUnit || null,
    p_recipient_note: recipientNote || null,
    p_signature_data: signatureData || null,
  });

  if (error) {
    console.error("Failed to confirm receipt", error);
    redirect(
      `/receipt/${token}?message=${encodeURIComponent(
        `Tanda terima gagal dikonfirmasi. Detail: ${error.message}`,
      )}`,
    );
  }

  revalidatePath(`/receipt/${token}`);
  redirect(`/receipt/${token}?confirmed=1`);
}

export async function confirmBatchReceiptAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const token = formString(formData, "token");
  const confirmedName = formString(formData, "recipient_name");
  const confirmedUnit = formString(formData, "recipient_unit");
  const confirmedNote = formString(formData, "recipient_note");
  const signatureData = formString(formData, "signature_data");

  if (!token) {
    redirect("/receipt-batch/invalid?message=Tanda terima tidak valid.");
  }

  if (!confirmedName) {
    redirect(
      `/receipt-batch/${token}?message=${encodeURIComponent(
        "Nama penerima wajib diisi.",
      )}`,
    );
  }

  const { error } = await supabase.rpc("confirm_receipt_batch_by_token", {
    p_token: token,
    p_confirmed_name: confirmedName,
    p_confirmed_unit: confirmedUnit || null,
    p_confirmed_note: confirmedNote || null,
    p_signature_data: signatureData || null,
  });

  if (error) {
    console.error("Failed to confirm batch receipt", error);
    redirect(
      `/receipt-batch/${token}?message=${encodeURIComponent(
        `Tanda terima gabungan gagal dikonfirmasi. Detail: ${error.message}`,
      )}`,
    );
  }

  revalidatePath(`/receipt-batch/${token}`);
  revalidatePath("/receipts");
  redirect(`/receipt-batch/${token}?confirmed=1`);
}

export async function resetReceiptRequestAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const receiptId = formString(formData, "receipt_id");
  const returnTo = normalizeReturnTo(formString(formData, "return_to"));

  if (!receiptId) {
    redirect(withMessage(returnTo, "Tanda terima tidak valid."));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "ADMIN") {
    if (profileError) {
      console.error("Failed to check admin role before receipt reset", profileError);
    }

    redirect(
      withMessage(returnTo, "Reset tanda terima hanya bisa dilakukan admin."),
    );
  }

  const { error } = await supabase
    .from("receipt_requests")
    .delete()
    .eq("id", receiptId);

  if (error) {
    console.error("Failed to reset receipt request", error);
    redirect(
      withMessage(
        returnTo,
        `Tanda terima gagal direset. Detail: ${error.message}`,
      ),
    );
  }

  revalidatePath(returnTo);
  redirect(withMessage(returnTo, "Tanda terima berhasil direset."));
}
