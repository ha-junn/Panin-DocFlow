"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

type AttachmentKind = "DOC" | "INV";
type Tone = "blue" | "red";

type CompressedAttachmentInputProps = {
  name: string;
  kind: AttachmentKind;
  tone: Tone;
};

const MAX_IMAGE_EDGE = 1600;
const WEBP_QUALITY = 0.7;

const fileButtonTone: Record<Tone, string> = {
  blue: "file:bg-[#0A3A60] hover:file:bg-[#082f4f]",
  red: "file:bg-[#D71920] hover:file:bg-[#b9151b]",
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getUploadStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 6);

  return `${year}-${month}-${day}-${hour}${minute}${second}-${random}`;
}

function createAttachmentName(kind: AttachmentKind, extension: string) {
  return `${kind}-${getUploadStamp()}.${extension}`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const imageUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Gambar gagal dibaca."));
    };
    image.src = imageUrl;
  });
}

function canvasToWebpBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
  });
}

async function compressImageToWebp(file: File, kind: AttachmentKind) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Browser tidak mendukung kompresi gambar.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToWebpBlob(canvas);

  if (!blob) {
    throw new Error("Gambar gagal dikompres.");
  }

  return new File([blob], createAttachmentName(kind, "webp"), {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function renameFile(file: File, kind: AttachmentKind) {
  const extension =
    file.name.split(".").pop()?.toLowerCase() ||
    (file.type === "application/pdf" ? "pdf" : "bin");

  return new File([file], createAttachmentName(kind, extension), {
    type: file.type,
    lastModified: Date.now(),
  });
}

function setInputFile(input: HTMLInputElement, file: File) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

export function CompressedAttachmentInput({
  name,
  kind,
  tone,
}: CompressedAttachmentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      setStatus(null);
      return;
    }

    setIsProcessing(true);
    setStatus("Memproses lampiran...");

    try {
      const preparedFile = file.type.startsWith("image/")
        ? await compressImageToWebp(file, kind)
        : renameFile(file, kind);

      setInputFile(input, preparedFile);
      setStatus(
        file.type.startsWith("image/")
          ? `Dikompres otomatis: ${formatBytes(file.size)} -> ${formatBytes(
              preparedFile.size,
            )} (.webp)`
          : `File siap diupload: ${preparedFile.name} (${formatBytes(
              preparedFile.size,
            )})`,
      );
    } catch (error) {
      console.error("Failed to prepare attachment", error);
      input.value = "";
      setStatus("Lampiran gagal diproses. Coba pilih file lain.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="application/pdf,image/*"
        disabled={isProcessing}
        onChange={handleFileChange}
        className={`mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 ${fileButtonTone[tone]} file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60`}
      />
      {status ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{status}</p>
      ) : null}
    </div>
  );
}
