import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Files are saved to /public/uploads/<subdir> so they're servable
// directly by Next.js as static files. This is a pragmatic default
// for local/dev use — for production, swap this for real object
// storage (S3/R2) and store the returned URL the same way; nothing
// else in the payment-request or application-document code needs to
// change, since callers only ever deal with the returned `url` string.
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const PUBLIC_ROOT = "/uploads";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

async function saveUploadedFile(
  file: File,
  subdir: string,
  allowedTypes: string[]
): Promise<{ url: string } | { error: string }> {
  if (!allowedTypes.includes(file.type)) {
    return { error: `File type not allowed. Accepted: ${allowedTypes.join(", ")}` };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File must be under 5MB." };
  }

  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const extFromType: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  const ext = extFromType[file.type] || "bin";
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const filePath = path.join(dir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return { url: `${PUBLIC_ROOT}/${subdir}/${fileName}` };
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"];

// Agent payment proof — images only (it's a screenshot).
export async function savePaymentScreenshot(file: File) {
  return saveUploadedFile(file, "payment-screenshots", IMAGE_TYPES);
}

// Application documents (Aadhaar copy, photo, signature, custom
// docs) — images or PDFs, since ID documents are commonly scanned
// as PDF.
export async function saveApplicationDocument(file: File) {
  return saveUploadedFile(file, "application-documents", DOCUMENT_TYPES);
}
