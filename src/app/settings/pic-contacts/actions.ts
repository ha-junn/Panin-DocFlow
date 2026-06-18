"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function settingsPath(message: string) {
  return `/settings/pic-contacts?message=${encodeURIComponent(message)}`;
}

function normalizeWhatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith("8")) {
    return `62${digits}`;
  }

  return digits;
}

async function getAuthenticatedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return supabase;
}

function revalidatePicViews() {
  revalidatePath("/settings/pic-contacts");
  revalidatePath("/receipts");
}

export async function createPicContactAction(formData: FormData) {
  const supabase = await getAuthenticatedSupabase();
  const name = formString(formData, "name");
  const whatsappNumber = normalizeWhatsappNumber(
    formString(formData, "whatsapp_number"),
  );
  const department = formString(formData, "department");

  if (!name || whatsappNumber.length < 10) {
    redirect(settingsPath("Nama PIC dan nomor WhatsApp yang valid wajib diisi."));
  }

  const { error } = await supabase.from("pic_contacts").insert({
    name,
    whatsapp_number: whatsappNumber,
    department: department || null,
  });

  if (error) {
    console.error("Failed to create PIC contact", error);
    redirect(
      settingsPath(
        "PIC gagal ditambahkan. Pastikan SQL Master PIC sudah dijalankan dan nama belum terdaftar.",
      ),
    );
  }

  revalidatePicViews();
  redirect(settingsPath("PIC dan nomor WhatsApp berhasil ditambahkan."));
}

export async function updatePicContactAction(formData: FormData) {
  const supabase = await getAuthenticatedSupabase();
  const id = formString(formData, "id");
  const name = formString(formData, "name");
  const whatsappNumber = normalizeWhatsappNumber(
    formString(formData, "whatsapp_number"),
  );
  const department = formString(formData, "department");
  const active = formData.get("active") === "on";

  if (!id || !name || whatsappNumber.length < 10) {
    redirect(settingsPath("Data PIC belum lengkap atau nomor WhatsApp tidak valid."));
  }

  const { error } = await supabase
    .from("pic_contacts")
    .update({
      name,
      whatsapp_number: whatsappNumber,
      department: department || null,
      active,
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update PIC contact", error);
    redirect(settingsPath("PIC gagal diperbarui. Periksa nama dan nomor WhatsApp."));
  }

  revalidatePicViews();
  redirect(settingsPath("Data PIC berhasil diperbarui."));
}

export async function deletePicContactAction(formData: FormData) {
  const supabase = await getAuthenticatedSupabase();
  const id = formString(formData, "id");

  if (!id) {
    redirect(settingsPath("PIC tidak valid."));
  }

  const { error } = await supabase.from("pic_contacts").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete PIC contact", error);
    redirect(settingsPath("PIC gagal dihapus."));
  }

  revalidatePicViews();
  redirect(settingsPath("PIC berhasil dihapus."));
}
