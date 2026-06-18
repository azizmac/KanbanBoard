import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

// Storage layer for attachments.
// - Production: S3-compatible store (e.g. MinIO on the mini-PC) when S3_* is set.
// - Local dev: falls back to disk under UPLOAD_DIR / ./uploads.

const useS3 = Boolean(process.env.S3_BUCKET && process.env.S3_ENDPOINT);
const bucket = process.env.S3_BUCKET ?? "";

let _s3: S3Client | null = null;
function s3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true, // required for MinIO
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      },
    });
  }
  return _s3;
}

function uploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export async function saveFile(storedName: string, data: Buffer, contentType?: string) {
  if (useS3) {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storedName,
        Body: data,
        ContentType: contentType,
      }),
    );
    return;
  }
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), data);
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  if (useS3) {
    const res = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: storedName }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
  return readFile(path.join(uploadDir(), storedName));
}

export async function deleteStoredFile(storedName: string) {
  try {
    if (useS3) {
      await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: storedName }));
      return;
    }
    await unlink(path.join(uploadDir(), storedName));
  } catch {
    // already gone — fine
  }
}
