"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uppercaseText } from "@/lib/text";

type CategoryType = "LETTER" | "INVOICE" | "BOTH";

const categoryTypes = new Set(["LETTER", "INVOICE", "BOTH"]);

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function settingsPath(message: string) {
  return `/settings/categories?message=${encodeURIComponent(message)}`;
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

function revalidateCategoryViews() {
  revalidatePath("/settings/categories");
  revalidatePath("/documents/new");
  revalidatePath("/search");
  revalidatePath("/documents");
  revalidatePath("/");
}

function getCategoryType(formData: FormData) {
  const type = formString(formData, "type");
  return categoryTypes.has(type) ? (type as CategoryType) : null;
}

export async function createCategoryAction(formData: FormData) {
  const supabase = await getAuthenticatedSupabase();
  const name = uppercaseText(formString(formData, "name"));
  const type = getCategoryType(formData);

  if (!name || !type) {
    redirect(settingsPath("Nama kategori dan jenis wajib diisi."));
  }

  const { error } = await supabase
    .from("document_categories")
    .insert({ name, type });

  if (error) {
    console.error("Failed to create category", error);
    redirect(settingsPath("Kategori gagal ditambahkan. Cek duplikasi nama/jenis."));
  }

  revalidateCategoryViews();
  redirect(settingsPath("Kategori berhasil ditambahkan."));
}

export async function updateCategoryAction(formData: FormData) {
  const supabase = await getAuthenticatedSupabase();
  const id = formString(formData, "id");
  const name = uppercaseText(formString(formData, "name"));
  const type = getCategoryType(formData);

  if (!id || !name || !type) {
    redirect(settingsPath("Data kategori belum lengkap."));
  }

  const { error } = await supabase
    .from("document_categories")
    .update({ name, type })
    .eq("id", id);

  if (error) {
    console.error("Failed to update category", error);
    redirect(settingsPath("Kategori gagal diperbarui. Cek duplikasi nama/jenis."));
  }

  revalidateCategoryViews();
  redirect(settingsPath("Kategori berhasil diperbarui."));
}

export async function deleteCategoryAction(formData: FormData) {
  const supabase = await getAuthenticatedSupabase();
  const id = formString(formData, "id");

  if (!id) {
    redirect(settingsPath("Kategori tidak valid."));
  }

  const { error } = await supabase
    .from("document_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete category", error);
    redirect(
      settingsPath(
        "Kategori gagal dihapus. Biasanya karena masih dipakai oleh dokumen.",
      ),
    );
  }

  revalidateCategoryViews();
  redirect(settingsPath("Kategori berhasil dihapus."));
}
