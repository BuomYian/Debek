/**
 * Pure constants, safe to import from Client Components — unlike
 * lib/cloudinary/config.ts (server-only, holds the actual SDK config
 * and secret). The upload dialog needs these client-side to validate a
 * file before ever hitting the network (Section 5.8).
 */

/** MIME types accepted for patient file uploads (Section 5.8). */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Max upload size in bytes (10 MB, per Section 5.8). */
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
