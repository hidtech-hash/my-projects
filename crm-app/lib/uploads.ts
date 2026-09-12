import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Screenshots are saved to /public/uploads/payment-screenshots so
// they're servable directly by Next.js as static files. This is a
// pragmatic default for local/dev use — for production, swap this
// for real object storage (S3/R2) and store the returned URL the
// same way; nothing else in the payment-request code needs to change,
// since callers only ever deal with the returned `url` string.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "payment-screenshots");
const PUBLIC_PREFIX = "/uploads/payment-screenshots";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function savePaymentScreenshot(file: File): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only PNG, JPG, or WEBP screenshots are allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "Screenshot must be under 5MB." };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return { url: `${PUBLIC_PREFIX}/${fileName}` };
}
