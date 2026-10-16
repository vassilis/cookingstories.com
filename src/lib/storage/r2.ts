import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type PhotoType = (typeof ALLOWED_TYPES)[number];

export const isPhotoType = (value: string): value is PhotoType =>
  (ALLOWED_TYPES as readonly string[]).includes(value);

let client: S3Client | undefined;

function r2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env();
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error("R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return { client, bucket: R2_BUCKET };
}

/**
 * A short-lived URL the browser can PUT a photo to directly, so uploads never pass through
 * our server. The caller must have checked that the user may edit `recipeId`.
 */
export async function createPhotoUploadUrl(recipeId: string, type: PhotoType) {
  const { client, bucket } = r2();
  const ext = type.split("/")[1];
  const key = `recipes/${recipeId}/${crypto.randomUUID()}.${ext}`;
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: type }),
    { expiresIn: 300 },
  );
  return { key, url };
}

/** Public URL for a stored object, served through the R2 custom domain (and Cloudflare's CDN). */
export function photoUrl(key: string): string {
  const base = env().R2_PUBLIC_URL;
  if (!base) throw new Error("R2_PUBLIC_URL is not set");
  return new URL(key, base.endsWith("/") ? base : `${base}/`).toString();
}
