import "server-only";

import { v2 as cloudinary } from "cloudinary";

/**
 * Server-only Cloudinary configuration. The API secret must never reach
 * the browser bundle — this module is guarded by `server-only` so an
 * accidental import from a Client Component fails the build instead of
 * silently leaking the secret (Section 5.8 / Section 7).
 *
 * The actual signed-upload signature endpoint is built in Phase 10.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

cloudinary.config({
  cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
  api_key: requireEnv("CLOUDINARY_API_KEY"),
  api_secret: requireEnv("CLOUDINARY_API_SECRET"),
  secure: true,
});

export { cloudinary };

/** MIME types accepted for patient file uploads (Section 5.8). */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Max upload size in bytes (10 MB, per Section 5.8). */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
